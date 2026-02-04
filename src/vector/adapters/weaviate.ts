import type { EmbeddingConfig, EmbeddingProvider, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { WeaviateClientLike, WeaviateNamespace } from '../types/weaviate'
import { createHash } from 'node:crypto'
import { resolveEmbedding } from '../embeddings/resolve'
import { matchesFilter } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

export async function createWeaviateAdapter(client: WeaviateClientLike, options: { embeddings: EmbeddingConfig, collection?: string, vectorizers?: any }): Promise<WeaviateVectorAdapter> {
  const { embedder } = await resolveEmbedding(options.embeddings)
  const collection = options.collection || 'vectors'

  const adapter = new WeaviateVectorAdapter(client, collection, embedder, options.vectorizers)
  await adapter.ensureCollection()
  return adapter
}

export class WeaviateVectorAdapter extends BaseVectorAdapter {
  readonly provider = 'weaviate' as const
  readonly supports = {
    remove: true,
    clear: true,
    close: true,
    filter: true,
  }

  private client: WeaviateClientLike
  private collection: string
  private embedder: EmbeddingProvider
  private ready = false
  private vectorizers?: any
  private uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  constructor(client: WeaviateClientLike, collection: string, embedder: EmbeddingProvider, vectorizers?: any) {
    super()
    this.client = client
    this.collection = collection
    this.embedder = embedder
    this.vectorizers = vectorizers
  }

  private normalizeId(id: string): string {
    if (this.uuidRegex.test(id))
      return id
    const hex = createHash('sha1').update(id).digest('hex').slice(0, 32)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  async ensureCollection(): Promise<void> {
    if (this.ready)
      return

    const exists = await this.client.collections.exists(this.collection)
    if (!exists) {
      await this.client.collections.create({
        name: this.collection,
        ...(this.vectorizers ? { vectorizers: this.vectorizers } : {}),
        properties: [
          { name: 'content', dataType: 'text' },
          { name: 'metadata', dataType: 'text' },
        ],
      })
    }

    this.ready = true
  }

  async index(docs: VectorDocument[]): Promise<{ count: number }> {
    if (docs.length === 0)
      return { count: 0 }

    await this.ensureCollection()

    const texts = docs.map(d => d.content)
    const embeddings = await this.embedder(texts)

    if (embeddings.length !== docs.length) {
      throw new Error(`Embedding count mismatch: expected ${docs.length}, got ${embeddings.length}`)
    }

    const collection = this.client.collections.get(this.collection)
    const objects = docs.map((doc, i) => {
      const metadata = doc.metadata ? { ...doc.metadata, _id: doc.id } : { _id: doc.id }
      return {
        id: this.normalizeId(doc.id),
        properties: {
          content: doc.content,
          metadata: JSON.stringify(metadata),
        },
        vectors: embeddings[i]!,
      }
    })

    const inserted = await collection.data.insertMany(objects)
    if (inserted?.hasErrors) {
      const errors = inserted.errors
        ? Object.values(inserted.errors).map((entry: any) => entry?.message || 'unknown error')
        : ['unknown error']
      throw new Error(`Weaviate insertMany failed: ${errors.join('; ')}`)
    }

    return { count: docs.length }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options
    const fetchLimit = filter ? limit * 4 : limit

    await this.ensureCollection()

    const [embedding] = await this.embedder([query])
    if (!embedding)
      throw new Error('Failed to generate query embedding')

    const collection = this.client.collections.get(this.collection)
    const response = await collection.query.nearVector(embedding, {
      limit: fetchLimit,
      returnMetadata: ['distance', 'score'],
      returnProperties: ['content', 'metadata'],
    })

    let mapped = (response.objects || []).map((obj: any) => {
      const props = obj.properties || {}
      const content = typeof props.content === 'string' ? props.content : undefined
      let meta: Record<string, any> | undefined
      let originalId: string | undefined
      if (props.metadata) {
        if (typeof props.metadata === 'string') {
          try {
            meta = JSON.parse(props.metadata)
          }
          catch {
            meta = { value: props.metadata }
          }
        }
        else if (typeof props.metadata === 'object' && props.metadata !== null) {
          meta = props.metadata
        }
      }

      const distance = obj.metadata?.distance
      const rawScore = typeof obj.metadata?.score === 'number' ? obj.metadata.score : undefined
      const score = typeof rawScore === 'number'
        ? rawScore
        : typeof distance === 'number' ? Math.max(0, 1 - distance) : 0

      if (meta && typeof meta._id === 'string') {
        originalId = meta._id
        delete meta._id
        if (Object.keys(meta).length === 0)
          meta = undefined
      }

      const result: VectorSearchResult = {
        id: originalId || obj.uuid,
        score: Math.max(0, Math.min(1, score)),
      }

      if (returnContent && content) {
        const { snippet, highlights } = extractSnippet(content, query)
        result.content = snippet
        if (returnMeta && highlights.length)
          result._meta = { ...result._meta, highlights }
      }

      if (returnMeta && typeof distance === 'number')
        result._meta = { ...result._meta, distance }

      if ((returnMetadata || filter) && meta)
        result.metadata = meta

      return result
    })

    if (filter)
      mapped = mapped.filter(r => matchesFilter(filter, r.metadata))

    if (!returnMetadata)
      mapped.forEach((r) => { delete r.metadata })

    return mapped.slice(0, limit)
  }

  override async remove(ids: string[]): Promise<{ count: number }> {
    await this.ensureCollection()
    const collection = this.client.collections.get(this.collection)
    await Promise.all(ids.map(id => collection.data.deleteById(this.normalizeId(id))))
    return { count: ids.length }
  }

  override async clear(): Promise<void> {
    await this.client.collections.delete(this.collection)
    this.ready = false
  }

  override async close(): Promise<void> {
    await this.client.close()
  }

  override get weaviate(): WeaviateNamespace {
    return { client: this.client, collection: this.collection }
  }
}

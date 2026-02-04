import type { EmbeddingConfig, EmbeddingProvider, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { QdrantClientLike, QdrantDistance, QdrantNamespace } from '../types/qdrant'
import { createHash } from 'node:crypto'
import { resolveEmbedding } from '../embeddings/resolve'
import { matchesFilter } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

export async function createQdrantAdapter(client: QdrantClientLike, options: { embeddings: EmbeddingConfig, collection?: string, distance?: QdrantDistance }): Promise<QdrantVectorAdapter> {
  const { embedder, dimensions } = await resolveEmbedding(options.embeddings)
  const collection = options.collection || 'vectors'
  const distance = options.distance || 'Cosine'

  const adapter = new QdrantVectorAdapter(client, collection, embedder, dimensions, distance)
  await adapter.ensureCollection()
  return adapter
}

export class QdrantVectorAdapter extends BaseVectorAdapter {
  readonly provider = 'qdrant' as const
  readonly supports = {
    remove: true,
    clear: true,
    close: false,
    filter: true,
  }

  private client: QdrantClientLike
  private collection: string
  private embedder: EmbeddingProvider
  private dimensions: number
  private distance: QdrantDistance
  private ready = false

  private uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  constructor(client: QdrantClientLike, collection: string, embedder: EmbeddingProvider, dimensions: number, distance: QdrantDistance) {
    super()
    this.client = client
    this.collection = collection
    this.embedder = embedder
    this.dimensions = dimensions
    this.distance = distance
  }

  private normalizeId(id: string): string | number {
    if (/^\\d+$/.test(id))
      return Number(id)
    if (this.uuidRegex.test(id))
      return id
    const hex = createHash('sha1').update(id).digest('hex').slice(0, 32)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  async ensureCollection(): Promise<void> {
    if (this.ready)
      return
    try {
      await this.client.getCollection(this.collection)
      this.ready = true
      return
    }
    catch {
      // ignore and create
    }

    await this.client.createCollection(this.collection, {
      vectors: {
        size: this.dimensions,
        distance: this.distance,
      },
    })
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

    const points = docs.map((doc, i) => ({
      id: this.normalizeId(doc.id),
      vector: embeddings[i]!,
      payload: {
        ...doc.metadata,
        _content: doc.content,
        _id: doc.id,
      },
    }))

    await this.client.upsert(this.collection, { points })

    return { count: docs.length }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options
    const fetchLimit = filter ? limit * 4 : limit

    await this.ensureCollection()

    const [embedding] = await this.embedder([query])
    if (!embedding)
      throw new Error('Failed to generate query embedding')

    const results = await this.client.search(this.collection, {
      vector: embedding,
      limit: fetchLimit,
      with_payload: true,
      with_vector: false,
    })

    let mapped = (results || []).map((m: any) => {
      const { _content, _id, ...rest } = m.payload || {}
      const meta = Object.keys(rest).length > 0 ? rest : undefined
      const score = typeof m.score === 'number' ? m.score : 0
      const result: VectorSearchResult = {
        id: typeof _id === 'string' ? _id : String(m.id),
        score: Math.max(0, Math.min(1, score)),
      }

      if (returnContent && _content) {
        const { snippet, highlights } = extractSnippet(_content, query)
        result.content = snippet
        if (returnMeta && highlights.length)
          result._meta = { ...result._meta, highlights }
      }

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

  async remove(ids: string[]): Promise<{ count: number }> {
    await this.ensureCollection()
    await this.client.delete(this.collection, { points: ids.map(id => this.normalizeId(id)) })
    return { count: ids.length }
  }

  async clear(): Promise<void> {
    await this.client.deleteCollection(this.collection)
    this.ready = false
  }

  async close(): Promise<void> {
    // no-op
  }

  get qdrant(): QdrantNamespace {
    return { client: this.client, collection: this.collection }
  }
}

import type { EmbeddingConfig, EmbeddingProvider, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { PineconeIndexLike, PineconeNamespace } from '../types/pinecone'
import { resolveEmbedding } from '../embeddings/resolve'
import { matchesFilter } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

export async function createPineconeAdapter(index: PineconeIndexLike, options: { embeddings: EmbeddingConfig, namespace?: string }): Promise<PineconeVectorAdapter> {
  const { embedder } = await resolveEmbedding(options.embeddings)
  return new PineconeVectorAdapter(index, embedder, options.namespace)
}

export class PineconeVectorAdapter extends BaseVectorAdapter {
  readonly provider = 'pinecone' as const
  readonly supports = {
    remove: true,
    clear: true,
    close: false,
    filter: true,
  }

  private indexClient: PineconeIndexLike
  private embedder: EmbeddingProvider
  private namespace?: string

  constructor(index: PineconeIndexLike, embedder: EmbeddingProvider, namespace?: string) {
    super()
    this.indexClient = index
    this.embedder = embedder
    this.namespace = namespace
  }

  async index(docs: VectorDocument[]): Promise<{ count: number }> {
    if (docs.length === 0)
      return { count: 0 }

    const texts = docs.map(d => d.content)
    const embeddings = await this.embedder(texts)

    if (embeddings.length !== docs.length) {
      throw new Error(`Embedding count mismatch: expected ${docs.length}, got ${embeddings.length}`)
    }

    const records = docs.map((doc, i) => ({
      id: doc.id,
      values: embeddings[i]!,
      metadata: {
        ...doc.metadata,
        _content: doc.content,
      },
    }))

    await this.indexClient.upsert({ records, namespace: this.namespace })

    return { count: docs.length }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options
    const fetchLimit = filter ? limit * 4 : limit

    const [embedding] = await this.embedder([query])
    if (!embedding)
      throw new Error('Failed to generate query embedding')

    const results = await this.indexClient.query({
      vector: embedding,
      topK: fetchLimit,
      includeMetadata: true,
      namespace: this.namespace,
    })

    let mapped = (results.matches || []).map((m: any) => {
      const { _content, ...rest } = m.metadata || {}
      const meta = Object.keys(rest).length > 0 ? rest : undefined
      const score = typeof m.score === 'number' ? m.score : 0
      const result: VectorSearchResult = {
        id: m.id,
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

  override async remove(ids: string[]): Promise<{ count: number }> {
    await this.indexClient.deleteMany({ ids, namespace: this.namespace })
    return { count: ids.length }
  }

  override async clear(): Promise<void> {
    await this.indexClient.deleteAll({ namespace: this.namespace })
  }

  override async close(): Promise<void> {
    // no-op
  }

  override get pinecone(): PineconeNamespace {
    return { index: this.indexClient, namespace: this.namespace }
  }
}

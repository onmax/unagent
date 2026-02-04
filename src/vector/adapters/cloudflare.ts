import type { EmbeddingConfig, EmbeddingProvider, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { CloudflareVectorNamespace, VectorizeIndexBinding } from '../types/cloudflare'
import { resolveEmbedding } from '../embeddings/resolve'
import { matchesFilter } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

export async function createCloudflareVectorAdapter(binding: VectorizeIndexBinding, embeddings: EmbeddingConfig): Promise<CloudflareVectorAdapter> {
  const { embedder } = await resolveEmbedding(embeddings)
  return new CloudflareVectorAdapter(binding, embedder)
}

export class CloudflareVectorAdapter extends BaseVectorAdapter {
  readonly provider = 'cloudflare' as const
  readonly supports = {
    remove: true,
    clear: false,
    close: false,
    filter: true,
  }

  private binding: VectorizeIndexBinding
  private embedder: EmbeddingProvider

  constructor(binding: VectorizeIndexBinding, embedder: EmbeddingProvider) {
    super()
    this.binding = binding
    this.embedder = embedder
  }

  async index(docs: VectorDocument[]): Promise<{ count: number }> {
    if (docs.length === 0)
      return { count: 0 }

    const texts = docs.map(d => d.content)
    const embeddings = await this.embedder(texts)

    if (embeddings.length !== docs.length) {
      throw new Error(`Embedding count mismatch: expected ${docs.length}, got ${embeddings.length}`)
    }

    const vectors = docs.map((doc, i) => ({
      id: doc.id,
      values: embeddings[i]!,
      metadata: {
        ...doc.metadata,
        _content: doc.content,
      },
    }))

    await this.binding.upsert(vectors)

    return { count: docs.length }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options
    const fetchLimit = filter ? limit * 4 : limit

    const [embedding] = await this.embedder([query])
    if (!embedding)
      throw new Error('Failed to generate query embedding')

    const results = await this.binding.query(embedding, {
      topK: fetchLimit,
      returnValues: false,
      returnMetadata: true,
    })

    let mapped = (results.matches || []).map((m: any) => {
      const { _content, ...rest } = m.metadata || {}
      const meta = Object.keys(rest).length > 0 ? rest : undefined
      const result: VectorSearchResult = {
        id: m.id,
        score: Math.max(0, Math.min(1, m.score)),
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
    await this.binding.deleteByIds(ids)
    return { count: ids.length }
  }

  override async close(): Promise<void> {
    // no-op
  }

  override get cloudflare(): CloudflareVectorNamespace {
    return { binding: this.binding }
  }
}

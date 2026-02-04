import type { VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { UpstashIndexLike, UpstashVectorNamespace } from '../types/upstash'
import { matchesFilter } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

export class UpstashVectorAdapter extends BaseVectorAdapter {
  readonly provider = 'upstash' as const
  readonly supports = {
    remove: true,
    clear: true,
    close: false,
    filter: true,
  }

  private indexClient: UpstashIndexLike
  private namespace?: string

  constructor(index: UpstashIndexLike, namespace?: string) {
    super()
    this.indexClient = index
    this.namespace = namespace
  }

  async index(docs: VectorDocument[]): Promise<{ count: number }> {
    if (docs.length === 0)
      return { count: 0 }

    const upstashVectors = docs.map(doc => ({
      id: doc.id,
      data: doc.content,
      metadata: {
        ...doc.metadata,
        _content: doc.content,
      },
    }))

    await this.indexClient.upsert(upstashVectors, { namespace: this.namespace })

    return { count: docs.length }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options
    const fetchLimit = filter ? limit * 4 : limit

    const results = await this.indexClient.query({
      data: query,
      topK: fetchLimit,
      includeMetadata: true,
      includeData: true,
      queryMode: 'DENSE',
    } as any, { namespace: this.namespace })

    let mapped = (results || []).map((m: any) => {
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
    await this.indexClient.delete(ids, { namespace: this.namespace })
    return { count: ids.length }
  }

  override async clear(): Promise<void> {
    await this.indexClient.reset({ namespace: this.namespace })
  }

  override async close(): Promise<void> {
    // no-op
  }

  override get upstash(): UpstashVectorNamespace {
    return { index: this.indexClient, namespace: this.namespace }
  }
}

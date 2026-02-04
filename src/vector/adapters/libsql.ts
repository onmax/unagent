import type { EmbeddingConfig, EmbeddingProvider, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { LibsqlClientLike, LibsqlNamespace } from '../types/libsql'
import { resolveEmbedding } from '../embeddings/resolve'
import { compileFilter } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

export async function createLibsqlAdapter(client: LibsqlClientLike, options: { embeddings: EmbeddingConfig }): Promise<LibsqlAdapter> {
  const { embedder, dimensions } = await resolveEmbedding(options.embeddings)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS vectors (
      id TEXT PRIMARY KEY,
      content TEXT,
      metadata TEXT,
      embedding F32_BLOB(${dimensions})
    )
  `)

  return new LibsqlAdapter(client, embedder)
}

export class LibsqlAdapter extends BaseVectorAdapter {
  readonly provider = 'libsql' as const
  readonly supports = {
    remove: true,
    clear: true,
    close: true,
    filter: true,
  }

  private client: LibsqlClientLike
  private embedder: EmbeddingProvider

  constructor(client: LibsqlClientLike, embedder: EmbeddingProvider) {
    super()
    this.client = client
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

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]!
      const vector = embeddings[i]!
      const vectorStr = JSON.stringify(vector)

      await this.client.execute({
        sql: `
          INSERT OR REPLACE INTO vectors (id, content, metadata, embedding)
          VALUES (?, ?, ?, vector(?))
        `,
        args: [
          doc.id,
          doc.content,
          doc.metadata ? JSON.stringify(doc.metadata) : null,
          vectorStr,
        ],
      })
    }

    return { count: docs.length }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options

    const [embedding] = await this.embedder([query])
    if (!embedding)
      throw new Error('Failed to generate query embedding')

    const vectorStr = JSON.stringify(embedding)
    const filterClause = filter ? compileFilter(filter, 'json') : { sql: '', params: [] }
    const whereClause = filterClause.sql ? `WHERE ${filterClause.sql}` : ''

    const results = await this.client.execute({
      sql: `
        SELECT
          id,
          content,
          metadata,
          vector_distance_cos(embedding, vector32(?)) as distance
        FROM vectors
        ${whereClause}
        ORDER BY distance
        LIMIT ?
      `,
      args: [vectorStr, ...filterClause.params, limit],
    })

    return (results.rows || []).map((row: any) => {
      const result: VectorSearchResult = {
        id: row.id,
        score: Math.max(0, 1 - row.distance),
      }

      if (returnContent && row.content) {
        const { snippet, highlights } = extractSnippet(row.content, query)
        result.content = snippet
        if (returnMeta && highlights.length)
          result._meta = { ...result._meta, highlights }
      }

      if (returnMetadata && row.metadata)
        result.metadata = JSON.parse(row.metadata)

      return result
    })
  }

  async remove(ids: string[]): Promise<{ count: number }> {
    for (const id of ids) {
      await this.client.execute({
        sql: 'DELETE FROM vectors WHERE id = ?',
        args: [id],
      })
    }
    return { count: ids.length }
  }

  async clear(): Promise<void> {
    await this.client.execute('DELETE FROM vectors')
  }

  async close(): Promise<void> {
    this.client.close()
  }

  get libsql(): LibsqlNamespace {
    return { client: this.client }
  }
}

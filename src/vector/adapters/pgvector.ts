import type { EmbeddingConfig, EmbeddingProvider, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { PgDistanceMetric, PgPoolLike, PgvectorNamespace } from '../types/pgvector'
import { resolveEmbedding } from '../embeddings/resolve'
import { compileFilter, pgParams } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

export async function createPgvectorAdapter(pool: PgPoolLike, options: { table?: string, metric?: PgDistanceMetric, embeddings: EmbeddingConfig }): Promise<PgvectorAdapter> {
  const { embedder, dimensions } = await resolveEmbedding(options.embeddings)
  const table = options.table || 'vectors'
  const metric = options.metric || 'cosine'

  await pool.query('CREATE EXTENSION IF NOT EXISTS vector')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id TEXT PRIMARY KEY,
      content TEXT,
      metadata JSONB,
      embedding vector(${dimensions})
    )
  `)

  const indexName = `${table}_embedding_idx`
  const opClass = metric === 'cosine' ? 'vector_cosine_ops' : metric === 'euclidean' ? 'vector_l2_ops' : 'vector_ip_ops'
  await pool.query(`
    CREATE INDEX IF NOT EXISTS ${indexName}
    ON ${table} USING ivfflat (embedding ${opClass})
    WITH (lists = 100)
  `).catch(() => {})

  return new PgvectorAdapter(pool, table, metric, embedder)
}

export class PgvectorAdapter extends BaseVectorAdapter {
  readonly provider = 'pgvector' as const
  readonly supports = {
    remove: true,
    clear: true,
    close: true,
    filter: true,
  }

  private pool: PgPoolLike
  private table: string
  private metric: PgDistanceMetric
  private embedder: EmbeddingProvider
  private analyzed = false

  constructor(pool: PgPoolLike, table: string, metric: PgDistanceMetric, embedder: EmbeddingProvider) {
    super()
    this.pool = pool
    this.table = table
    this.metric = metric
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
      const vectorStr = `[${vector.join(',')}]`

      await this.pool.query(
        `INSERT INTO ${this.table} (id, content, metadata, embedding)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
           embedding = EXCLUDED.embedding`,
        [doc.id, doc.content, doc.metadata || null, vectorStr],
      )
    }

    if (!this.analyzed) {
      await this.pool.query(`ANALYZE ${this.table}`).catch(() => {})
      this.analyzed = true
    }

    return { count: docs.length }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options

    const [embedding] = await this.embedder([query])
    if (!embedding)
      throw new Error('Failed to generate query embedding')

    const vectorStr = `[${embedding.join(',')}]`

    const filterClause = filter ? compileFilter(filter, 'jsonb') : { sql: '', params: [] }
    const pgFilterSql = filterClause.sql ? pgParams(filterClause.sql, 2) : ''
    const whereClause = pgFilterSql ? `WHERE ${pgFilterSql}` : ''
    const limitParam = `$${filterClause.params.length + 2}`

    const distanceOp = this.metric === 'cosine' ? '<=>' : this.metric === 'euclidean' ? '<->' : '<#>'

    const result = await this.pool.query(
      `SELECT id, content, metadata, embedding ${distanceOp} $1::vector as distance
       FROM ${this.table}
       ${whereClause}
       ORDER BY embedding ${distanceOp} $1::vector
       LIMIT ${limitParam}`,
      [vectorStr, ...filterClause.params, limit],
    )

    return result.rows.map((row: any) => {
      const score = this.metric === 'inner_product'
        ? Math.max(0, Math.min(1, (row.distance + 1) / 2))
        : Math.max(0, 1 - row.distance)

      const searchResult: VectorSearchResult = {
        id: row.id,
        score,
      }

      if (returnContent && row.content) {
        const { snippet, highlights } = extractSnippet(row.content, query)
        searchResult.content = snippet
        if (returnMeta && highlights.length)
          searchResult._meta = { ...searchResult._meta, highlights }
      }

      if (returnMetadata && row.metadata)
        searchResult.metadata = row.metadata

      return searchResult
    })
  }

  override async remove(ids: string[]): Promise<{ count: number }> {
    await this.pool.query(
      `DELETE FROM ${this.table} WHERE id = ANY($1)`,
      [ids],
    )
    return { count: ids.length }
  }

  override async clear(): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table}`)
  }

  override async close(): Promise<void> {
    await this.pool.end()
  }

  override get pgvector(): PgvectorNamespace {
    return { pool: this.pool }
  }
}

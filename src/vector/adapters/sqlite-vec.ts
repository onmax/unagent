import type { EmbeddingConfig, EmbeddingProvider, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../types'
import type { SqliteDatabaseLike, SqliteVecNamespace } from '../types/sqlite-vec'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { resolveEmbedding } from '../embeddings/resolve'
import { VectorError } from '../errors'
import { compileFilter } from '../filter'
import { extractSnippet } from '../utils/extract-snippet'
import { BaseVectorAdapter } from './base'

async function loadSqliteVec(db: SqliteDatabaseLike): Promise<void> {
  let mod: any
  try {
    mod = await import('sqlite-vec')
  }
  catch (error) {
    throw new VectorError(`[sqlite-vec] sqlite-vec package is required. Install it to use this provider. Original error: ${error instanceof Error ? error.message : error}`)
  }

  const loader = mod.load ?? mod.default?.load ?? mod.default ?? mod
  if (typeof loader !== 'function') {
    throw new VectorError('[sqlite-vec] sqlite-vec load() is not available')
  }
  loader(db)
}

export async function createSqliteVecAdapter(dbPath: string | undefined, embeddings: EmbeddingConfig): Promise<SqliteVecAdapter> {
  const { embedder, dimensions } = await resolveEmbedding(embeddings)

  const nodeSqlite = globalThis.process?.getBuiltinModule?.('node:sqlite') as typeof import('node:sqlite') | undefined
  if (!nodeSqlite)
    throw new VectorError('[sqlite-vec] node:sqlite runtime is required (Node.js >= 22.5)')

  const path = dbPath || ':memory:'
  if (path !== ':memory:')
    mkdirSync(dirname(path), { recursive: true })

  const db = new nodeSqlite.DatabaseSync(path, {
    allowExtension: true,
    open: true,
    readOnly: false,
  })

  await loadSqliteVec(db as unknown as SqliteDatabaseLike)
  db.exec('PRAGMA foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS vector_metadata (
      id TEXT PRIMARY KEY,
      content TEXT,
      metadata TEXT
    )
  `)

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vectors
    USING vec0(embedding float[${dimensions}])
  `)

  return new SqliteVecAdapter(db as unknown as SqliteDatabaseLike, embedder, dimensions)
}

export class SqliteVecAdapter extends BaseVectorAdapter {
  readonly provider = 'sqlite-vec' as const
  readonly supports = {
    remove: true,
    clear: true,
    close: true,
    filter: true,
  }

  private db: SqliteDatabaseLike
  private embedder: EmbeddingProvider
  private dimensions: number

  constructor(db: SqliteDatabaseLike, embedder: EmbeddingProvider, dimensions: number) {
    super()
    this.db = db
    this.embedder = embedder
    this.dimensions = dimensions
  }

  async index(docs: VectorDocument[]): Promise<{ count: number }> {
    if (docs.length === 0)
      return { count: 0 }

    const texts = docs.map(d => d.content)
    const embeddings = await this.embedder(texts)

    if (embeddings.length !== docs.length) {
      throw new Error(`Embedding count mismatch: expected ${docs.length}, got ${embeddings.length}`)
    }

    this.db.prepare('BEGIN').run()

    try {
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]!
        const vector = embeddings[i]!

        if (vector.length !== this.dimensions) {
          throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`)
        }

        const embedding = new Float32Array(vector)

        const existing = this.db.prepare('SELECT rowid FROM vector_metadata WHERE id = ?').get(doc.id) as { rowid: bigint } | undefined

        if (existing) {
          this.db.prepare('UPDATE vectors SET embedding = ? WHERE rowid = ?').run(embedding, existing.rowid)
          this.db.prepare('UPDATE vector_metadata SET content = ?, metadata = ? WHERE rowid = ?').run(
            doc.content,
            doc.metadata ? JSON.stringify(doc.metadata) : null,
            existing.rowid,
          )
        }
        else {
          const result = this.db.prepare('INSERT INTO vectors (embedding) VALUES (?)').run(embedding)
          const rowid = result.lastInsertRowid
          this.db.prepare('INSERT INTO vector_metadata (rowid, id, content, metadata) VALUES (?, ?, ?, ?)').run(
            rowid,
            doc.id,
            doc.content,
            doc.metadata ? JSON.stringify(doc.metadata) : null,
          )
        }
      }

      this.db.prepare('COMMIT').run()
      return { count: docs.length }
    }
    catch (error) {
      this.db.prepare('ROLLBACK').run()
      throw error
    }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { limit = 10, returnContent = false, returnMetadata = true, returnMeta = true, filter } = options

    const [embedding] = await this.embedder([query])
    if (!embedding)
      throw new Error('Failed to generate query embedding')

    const queryEmbedding = new Float32Array(embedding)
    const filterClause = compileFilter(filter, 'json')
    const filterWhere = filterClause.sql
      ? `AND rowid IN (SELECT rowid FROM vector_metadata WHERE ${filterClause.sql})`
      : ''

    const vecResults = this.db.prepare(`
      SELECT rowid, distance
      FROM vectors
      WHERE embedding MATCH ?
      ${filterWhere}
      ORDER BY distance
      LIMIT ?
    `).all(queryEmbedding, ...filterClause.params, limit) as Array<{ rowid: bigint, distance: number }>

    return vecResults.map((row) => {
      const meta = this.db.prepare('SELECT id, content, metadata FROM vector_metadata WHERE rowid = ?')
        .get(row.rowid) as { id: string, content: string | null, metadata: string | null } | undefined

      if (!meta)
        return null

      const result: VectorSearchResult = {
        id: meta.id,
        score: 1 / (1 + row.distance),
      }

      if (returnContent && meta.content) {
        const { snippet, highlights } = extractSnippet(meta.content, query)
        result.content = snippet
        if (returnMeta && highlights.length)
          result._meta = { ...result._meta, highlights }
      }

      if (returnMetadata && meta.metadata)
        result.metadata = JSON.parse(meta.metadata)

      return result
    }).filter(Boolean) as VectorSearchResult[]
  }

  override async remove(ids: string[]): Promise<{ count: number }> {
    this.db.prepare('BEGIN').run()

    try {
      for (const id of ids) {
        const meta = this.db.prepare('SELECT rowid FROM vector_metadata WHERE id = ?').get(id) as { rowid: bigint } | undefined
        if (meta) {
          this.db.prepare('DELETE FROM vectors WHERE rowid = ?').run(meta.rowid)
          this.db.prepare('DELETE FROM vector_metadata WHERE rowid = ?').run(meta.rowid)
        }
      }

      this.db.prepare('COMMIT').run()
      return { count: ids.length }
    }
    catch (error) {
      this.db.prepare('ROLLBACK').run()
      throw error
    }
  }

  override async clear(): Promise<void> {
    this.db.exec('DELETE FROM vectors')
    this.db.exec('DELETE FROM vector_metadata')
  }

  override async close(): Promise<void> {
    this.db.close?.()
  }

  override get sqliteVec(): SqliteVecNamespace {
    return { db: this.db }
  }
}

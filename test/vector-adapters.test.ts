import { describe, expect, it, vi } from 'vitest'
import { CloudflareVectorAdapter } from '../src/vector/adapters/cloudflare'
import { PgvectorAdapter } from '../src/vector/adapters/pgvector'
import { SqliteVecAdapter } from '../src/vector/adapters/sqlite-vec'
import { UpstashVectorAdapter } from '../src/vector/adapters/upstash'
import { NotSupportedError } from '../src/vector/errors'

describe('vector adapters', () => {
  it('cloudflare search respects filter and returnMetadata', async () => {
    const binding = {
      upsert: vi.fn(async () => {}),
      query: vi.fn(async () => ({
        matches: [
          { id: 'keep', score: 0.9, metadata: { category: 'keep', _content: 'hello world' } },
          { id: 'drop', score: 0.1, metadata: { category: 'drop', _content: 'bye world' } },
        ],
      })),
      insert: vi.fn(async () => {}),
      deleteByIds: vi.fn(async () => {}),
    }

    const embedder = vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2]))
    const adapter = new CloudflareVectorAdapter(binding, embedder)

    const results = await adapter.search('hello', { filter: { category: 'keep' }, returnContent: true, returnMetadata: false })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('keep')
    expect(results[0].metadata).toBeUndefined()
    expect(results[0].content).toContain('hello')
  })

  it('cloudflare clear throws NotSupportedError', async () => {
    const binding = {
      upsert: vi.fn(async () => {}),
      query: vi.fn(async () => ({ matches: [] })),
      insert: vi.fn(async () => {}),
      deleteByIds: vi.fn(async () => {}),
    }
    const embedder = vi.fn(async () => [])
    const adapter = new CloudflareVectorAdapter(binding, embedder)
    await expect(adapter.clear()).rejects.toBeInstanceOf(NotSupportedError)
  })

  it('upstash search respects filter and returnMetadata', async () => {
    const index = {
      upsert: vi.fn(async () => {}),
      query: vi.fn(async () => ([
        { id: 'keep', score: 0.7, metadata: { tag: 'keep', _content: 'alpha beta' } },
        { id: 'drop', score: 0.2, metadata: { tag: 'drop', _content: 'gamma delta' } },
      ])),
      delete: vi.fn(async () => {}),
      reset: vi.fn(async () => {}),
    }

    const adapter = new UpstashVectorAdapter(index, 'ns')
    const results = await adapter.search('alpha', { filter: { tag: 'keep' }, returnContent: true, returnMetadata: false })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('keep')
    expect(results[0].metadata).toBeUndefined()
    expect(results[0].content).toContain('alpha')
  })

  it('pgvector index throws on embedding count mismatch', async () => {
    const pool = {
      query: vi.fn(async () => ({ rows: [] })),
      end: vi.fn(async () => {}),
    }
    const badEmbedder = vi.fn(async () => [[0.1, 0.2]])
    const adapter = new PgvectorAdapter(pool, 'vectors', 'cosine', badEmbedder)
    await expect(adapter.index([{ id: '1', content: 'a' }, { id: '2', content: 'b' }])).rejects.toThrow('Embedding count mismatch')
  })

  it('sqlite-vec index throws on vector dimension mismatch', async () => {
    const db = {
      exec: vi.fn(() => {}),
      prepare: vi.fn((_sql: string) => ({
        run: () => ({ lastInsertRowid: 1 }),
        get: () => undefined,
        all: () => [],
      })),
      close: vi.fn(() => {}),
    }

    const embedder = vi.fn(async () => [[0.1, 0.2]])
    const adapter = new SqliteVecAdapter(db, embedder, 3)
    await expect(adapter.index([{ id: '1', content: 'a' }])).rejects.toThrow('Vector dimension mismatch')
  })
})

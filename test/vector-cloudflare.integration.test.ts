import { describe, expect, it } from 'vitest'

const baseUrl = process.env.VECTORIZE_TEST_URL
const describeMaybe = baseUrl ? describe : describe.skip

function normalizeBase(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

async function postJson<T = any>(base: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<T>
}

describeMaybe('vectorize playground (integration)', () => {
  it('indexes, searches, removes, and clears (best-effort)', async () => {
    const base = normalizeBase(baseUrl!)
    const docs = [
      { id: 'doc-a', content: 'hello from integration test', metadata: { tag: 'it' } },
      { id: 'doc-b', content: 'vector search integration check', metadata: { tag: 'it' } },
    ]

    const indexRes = await postJson(base, '/api/vector/index', { docs })
    expect(indexRes.count).toBe(2)

    const searchRes = await postJson(base, '/api/vector/search', { query: 'hello', options: { limit: 5, returnMetadata: true } })
    expect(Array.isArray(searchRes.results)).toBe(true)
    expect(searchRes.results.length).toBeGreaterThan(0)

    const removeRes = await postJson(base, '/api/vector/remove', { ids: ['doc-a', 'doc-b'] })
    expect(removeRes.count).toBe(2)

    const clearRes = await postJson(base, '/api/vector/clear', {})
    if (clearRes.error) {
      expect(String(clearRes.error)).toMatch(/not supported/i)
    }
    else {
      expect(clearRes.cleared).toBe(true)
    }
  })
})

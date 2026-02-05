import { describe, expect, it } from 'vitest'
import { ensureVercelRequestContext } from '../src/vercel'

describe('vercel/ensureVercelRequestContext', () => {
  const sym = Symbol.for('@vercel/request-context')

  it('sets the global symbol when missing', () => {
    const g = globalThis as unknown as Record<symbol, unknown>
    const prev = g[sym]
    try {
      delete g[sym]

      ensureVercelRequestContext(() => ({ headers: { 'x-test': '1' } }))

      const ctx = (g[sym] as { get?: () => any } | undefined)?.get?.()
      expect(ctx).toEqual({ headers: { 'x-test': '1' } })
    }
    finally {
      if (prev === undefined) {
        delete g[sym]
      }
      else {
        g[sym] = prev
      }
    }
  })

  it('does not overwrite an existing symbol', () => {
    const g = globalThis as unknown as Record<symbol, unknown>
    const prev = g[sym]
    const existing = { get: () => ({ headers: { existing: 'true' } }) }
    try {
      g[sym] = existing

      ensureVercelRequestContext(() => ({ headers: { replaced: 'true' } }))

      expect(g[sym]).toBe(existing)
      const ctx = (g[sym] as { get?: () => any } | undefined)?.get?.()
      expect(ctx).toEqual({ headers: { existing: 'true' } })
    }
    finally {
      if (prev === undefined) {
        delete g[sym]
      }
      else {
        g[sym] = prev
      }
    }
  })
})

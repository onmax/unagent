import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectQueue, isQueueAvailable } from '../src/queue'

describe('queue/detectQueue', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects Cloudflare Workers via CLOUDFLARE_WORKER', () => {
    process.env.CLOUDFLARE_WORKER = '1'
    const result = detectQueue()
    expect(result.type).toBe('cloudflare')
    expect(result.details?.runtime).toBe('workers')
  })

  it('detects Cloudflare Pages via CF_PAGES', () => {
    process.env.CF_PAGES = '1'
    const result = detectQueue()
    expect(result.type).toBe('cloudflare')
  })

  it('detects Vercel via VERCEL env', () => {
    process.env.VERCEL = '1'
    const result = detectQueue()
    expect(result.type).toBe('vercel')
  })

  it('returns none when no queue env detected', () => {
    delete process.env.CLOUDFLARE_WORKER
    delete process.env.CF_PAGES
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    delete process.env.NETLIFY
    delete process.env.NETLIFY_LOCAL
    delete process.env.CONTEXT
    const result = detectQueue()
    expect(result.type).toBe('none')
  })

  it('detects Netlify via NETLIFY env', () => {
    delete process.env.CLOUDFLARE_WORKER
    delete process.env.CF_PAGES
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    process.env.NETLIFY = 'true'
    process.env.CONTEXT = 'production'
    const result = detectQueue()
    expect(result.type).toBe('netlify')
    expect(result.details?.context).toBe('production')
  })
})

describe('queue/isQueueAvailable', () => {
  const originalResolve = require.resolve
  const originalEnv = process.env
  const originalGlobalRequire = (globalThis as { require?: { resolve?: (id: string) => string } }).require

  afterEach(() => {
    require.resolve = originalResolve
    process.env = originalEnv
    if (originalGlobalRequire) {
      (globalThis as { require?: { resolve?: (id: string) => string } }).require = originalGlobalRequire
    }
    else {
      delete (globalThis as { require?: { resolve?: (id: string) => string } }).require
    }
    vi.restoreAllMocks()
  })

  it('returns false when @vercel/queue cannot be resolved', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => {
        throw new Error('missing')
      },
    }
    expect(isQueueAvailable('vercel')).toBe(false)
  })

  it('returns true when @vercel/queue resolves', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => '@vercel/queue',
    }
    expect(isQueueAvailable('vercel')).toBe(true)
  })

  it('returns true for cloudflare when runtime env is present', () => {
    process.env = { ...originalEnv, CLOUDFLARE_WORKER: '1' }
    expect(isQueueAvailable('cloudflare')).toBe(true)
  })

  it('returns false when @netlify/async-workloads cannot be resolved', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => {
        throw new Error('missing')
      },
    }
    expect(isQueueAvailable('netlify')).toBe(false)
  })

  it('returns true when @netlify/async-workloads resolves', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => '@netlify/async-workloads',
    }
    expect(isQueueAvailable('netlify')).toBe(true)
  })
})

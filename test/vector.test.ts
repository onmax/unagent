import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectVector, isVectorAvailable } from '../src/vector'

describe('vector/detectVector', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects Cloudflare via CLOUDFLARE_WORKER', () => {
    process.env.CLOUDFLARE_WORKER = '1'
    const result = detectVector()
    expect(result.type).toBe('cloudflare')
  })

  it('detects Upstash via UPSTASH_VECTOR env', () => {
    process.env.UPSTASH_VECTOR_URL = 'https://example.upstash.io'
    process.env.UPSTASH_VECTOR_TOKEN = 'token'
    const result = detectVector()
    expect(result.type).toBe('upstash')
  })

  it('returns none when no vector env detected', () => {
    delete process.env.CLOUDFLARE_WORKER
    delete process.env.CF_PAGES
    delete process.env.UPSTASH_VECTOR_URL
    delete process.env.UPSTASH_VECTOR_TOKEN
    const result = detectVector()
    expect(result.type).toBe('none')
  })
})

describe('vector/isVectorAvailable', () => {
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

  it('returns false when module cannot be resolved', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => {
        throw new Error('missing')
      },
    }
    expect(isVectorAvailable('upstash')).toBe(false)
  })

  it('returns true when module resolves', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => 'pg',
    }
    expect(isVectorAvailable('pgvector')).toBe(true)
  })

  it('returns true for cloudflare when runtime env is present', () => {
    process.env = { ...originalEnv, CLOUDFLARE_WORKER: '1' }
    expect(isVectorAvailable('cloudflare')).toBe(true)
  })
})

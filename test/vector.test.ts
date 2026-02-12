import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectVector, isVectorAvailable, validateVectorConfig } from '../src/vector'

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

describe('vector/validateVectorConfig (sqlite-vec)', () => {
  const originalGlobalRequire = (globalThis as { require?: { resolve?: (id: string) => string } }).require
  const processWithBuiltin = globalThis.process as typeof globalThis.process & { getBuiltinModule?: (id: string) => unknown }
  const originalGetBuiltinModule = processWithBuiltin.getBuiltinModule

  const dummyEmbeddings = {
    async resolve() {
      return {
        embedder: async (_texts: string[]) => [[0.1]],
        dimensions: 1,
      }
    },
  }

  afterEach(() => {
    if (originalGlobalRequire) {
      (globalThis as { require?: { resolve?: (id: string) => string } }).require = originalGlobalRequire
    }
    else {
      delete (globalThis as { require?: { resolve?: (id: string) => string } }).require
    }
    processWithBuiltin.getBuiltinModule = originalGetBuiltinModule
  })

  it('flags missing node:sqlite runtime', () => {
    processWithBuiltin.getBuiltinModule = () => undefined
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => 'sqlite-vec',
    }

    const result = validateVectorConfig({
      name: 'sqlite-vec',
      embeddings: dummyEmbeddings,
    })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'SQLITE_VEC_RUNTIME_UNSUPPORTED', severity: 'error' }),
    ])
  })

  it('flags missing sqlite-vec package', () => {
    processWithBuiltin.getBuiltinModule = () => ({})
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => {
        throw new Error('missing')
      },
    }

    const result = validateVectorConfig({
      name: 'sqlite-vec',
      embeddings: dummyEmbeddings,
    })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'SQLITE_VEC_PACKAGE_MISSING', severity: 'error' }),
    ])
  })

  it('returns ok=true when runtime and package are available', () => {
    processWithBuiltin.getBuiltinModule = () => ({})
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => 'sqlite-vec',
    }

    const result = validateVectorConfig({
      name: 'sqlite-vec',
      embeddings: dummyEmbeddings,
    })
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })
})

describe('vector/validateVectorConfig (pinecone)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.PINECONE_API_KEY
  })

  afterEach(() => {
    process.env = originalEnv
  })

  const dummyEmbeddings = {
    async resolve() {
      return {
        embedder: async (_texts: string[]) => [[0.1]],
        dimensions: 1,
      }
    },
  }

  it('returns missing apiKey for pinecone', () => {
    const result = validateVectorConfig({
      name: 'pinecone',
      host: 'example-host',
      embeddings: dummyEmbeddings,
    })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'PINECONE_API_KEY_REQUIRED', severity: 'error' }),
    ])
  })

  it('returns missing host/index for pinecone', () => {
    const result = validateVectorConfig({
      name: 'pinecone',
      apiKey: 'pc-key',
      embeddings: dummyEmbeddings,
    })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'PINECONE_HOST_OR_INDEX_REQUIRED', severity: 'error' }),
    ])
  })

  it('returns ok=true for valid pinecone config', () => {
    const result = validateVectorConfig({
      name: 'pinecone',
      apiKey: 'pc-key',
      host: 'example-host',
      embeddings: dummyEmbeddings,
    })
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })
})

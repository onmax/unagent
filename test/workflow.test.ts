import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectWorkflow, isWorkflowAvailable } from '../src/workflow'

describe('workflow/detectWorkflow', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects Cloudflare Workers via CLOUDFLARE_WORKER', () => {
    process.env.CLOUDFLARE_WORKER = '1'
    const result = detectWorkflow()
    expect(result.type).toBe('cloudflare')
    expect(result.details?.runtime).toBe('workers')
  })

  it('detects Cloudflare Pages via CF_PAGES', () => {
    process.env.CF_PAGES = '1'
    const result = detectWorkflow()
    expect(result.type).toBe('cloudflare')
  })

  it('detects Vercel via VERCEL env', () => {
    process.env.VERCEL = '1'
    const result = detectWorkflow()
    expect(result.type).toBe('vercel')
  })

  it('returns none when no workflow env detected', () => {
    delete process.env.CLOUDFLARE_WORKER
    delete process.env.CF_PAGES
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    const result = detectWorkflow()
    expect(result.type).toBe('none')
  })
})

describe('workflow/isWorkflowAvailable', () => {
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

  it('returns false when workflow/api cannot be resolved', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => {
        throw new Error('missing')
      },
    }
    expect(isWorkflowAvailable('vercel')).toBe(false)
  })

  it('returns true when workflow/api resolves', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => 'workflow/api',
    }
    expect(isWorkflowAvailable('vercel')).toBe(true)
  })

  it('returns true for cloudflare when runtime env is present', () => {
    process.env = { ...originalEnv, CLOUDFLARE_WORKER: '1' }
    expect(isWorkflowAvailable('cloudflare')).toBe(true)
  })
})

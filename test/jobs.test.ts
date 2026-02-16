import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectJobs, isJobsAvailable } from '../src/jobs'

describe('jobs/detectJobs', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects Netlify via NETLIFY env', () => {
    process.env.NETLIFY = 'true'
    process.env.CONTEXT = 'production'
    const result = detectJobs()
    expect(result.type).toBe('netlify')
    expect(result.details?.context).toBe('production')
  })

  it('returns none when no jobs env is detected', () => {
    delete process.env.NETLIFY
    delete process.env.NETLIFY_LOCAL
    delete process.env.CONTEXT
    const result = detectJobs()
    expect(result.type).toBe('none')
  })
})

describe('jobs/isJobsAvailable', () => {
  const originalResolve = require.resolve
  const originalGlobalRequire = (globalThis as { require?: { resolve?: (id: string) => string } }).require

  afterEach(() => {
    require.resolve = originalResolve
    if (originalGlobalRequire) {
      (globalThis as { require?: { resolve?: (id: string) => string } }).require = originalGlobalRequire
    }
    else {
      delete (globalThis as { require?: { resolve?: (id: string) => string } }).require
    }
    vi.restoreAllMocks()
  })

  it('returns false when @netlify/async-workloads cannot be resolved', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => {
        throw new Error('missing')
      },
    }
    expect(isJobsAvailable('netlify')).toBe(false)
  })

  it('returns true when @netlify/async-workloads resolves', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => '@netlify/async-workloads',
    }
    expect(isJobsAvailable('netlify')).toBe(true)
  })
})

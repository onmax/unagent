import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectSandbox, isSandboxAvailable } from '../src/sandbox'

describe('sandbox/detectSandbox', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects Cloudflare Workers via CLOUDFLARE_WORKER', () => {
    process.env.CLOUDFLARE_WORKER = '1'
    const result = detectSandbox()
    expect(result.type).toBe('cloudflare')
    expect(result.details?.runtime).toBe('workers')
  })

  it('detects Cloudflare Pages via CF_PAGES', () => {
    process.env.CF_PAGES = '1'
    const result = detectSandbox()
    expect(result.type).toBe('cloudflare')
  })

  it('detects Vercel via VERCEL env', () => {
    process.env.VERCEL = '1'
    const result = detectSandbox()
    expect(result.type).toBe('vercel')
  })

  it('detects Vercel via VERCEL_ENV', () => {
    process.env.VERCEL_ENV = 'production'
    const result = detectSandbox()
    expect(result.type).toBe('vercel')
    expect(result.details?.env).toBe('production')
  })

  it('detects Docker via DOCKER_CONTAINER', () => {
    process.env.DOCKER_CONTAINER = '1'
    const result = detectSandbox()
    expect(result.type).toBe('docker')
  })

  it('returns none when no sandbox detected', () => {
    delete process.env.CLOUDFLARE_WORKER
    delete process.env.CF_PAGES
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    delete process.env.DOCKER_CONTAINER
    const result = detectSandbox()
    expect(result.type).toBe('none')
  })
})

describe('sandbox/isSandboxAvailable', () => {
  const originalRequire = (globalThis as { require?: { resolve?: (id: string) => string } }).require

  beforeEach(() => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: (id: string) => id,
    }
  })

  afterEach(() => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = originalRequire
  })

  it('returns true for vercel when package installed', () => {
    expect(isSandboxAvailable('vercel')).toBe(true)
  })

  it('returns true for cloudflare when package installed', () => {
    expect(isSandboxAvailable('cloudflare')).toBe(true)
  })
})

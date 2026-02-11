import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectBrowser, isBrowserAvailable } from '../src/browser'

describe('browser/detectBrowser', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects Cloudflare Workers via CLOUDFLARE_WORKER', () => {
    process.env.CLOUDFLARE_WORKER = '1'
    const result = detectBrowser()
    expect(result.type).toBe('cloudflare')
    expect(result.details?.runtime).toBe('workers')
  })

  it('detects Cloudflare Pages via CF_PAGES', () => {
    process.env.CF_PAGES = '1'
    const result = detectBrowser()
    expect(result.type).toBe('cloudflare')
    expect(result.details?.runtime).toBe('pages')
  })

  it('returns none when no browser runtime is detected', () => {
    delete process.env.CLOUDFLARE_WORKER
    delete process.env.CF_PAGES
    const result = detectBrowser()
    expect(result.type).toBe('none')
  })
})

describe('browser/isBrowserAvailable', () => {
  const originalRequire = (globalThis as { require?: { resolve?: (id: string) => string } }).require
  const originalEnv = process.env

  afterEach(() => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = originalRequire
    process.env = originalEnv
  })

  it('returns true for playwright/browserbase/cloudflare when modules resolve', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: (id: string) => id,
    }

    expect(isBrowserAvailable('playwright')).toBe(true)
    expect(isBrowserAvailable('browserbase')).toBe(true)
    expect(isBrowserAvailable('cloudflare')).toBe(true)
  })

  it('returns false when required modules cannot be resolved', () => {
    ;(globalThis as { require?: { resolve?: (id: string) => string } }).require = {
      resolve: () => {
        throw new Error('missing')
      },
    }

    expect(isBrowserAvailable('playwright')).toBe(false)
    expect(isBrowserAvailable('browserbase')).toBe(false)
  })

  it('returns true for cloudflare when cloudflare runtime env is present', () => {
    process.env = { ...originalEnv, CLOUDFLARE_WORKER: '1' }
    expect(isBrowserAvailable('cloudflare')).toBe(true)
  })
})

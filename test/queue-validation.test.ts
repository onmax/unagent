import { describe, expect, it } from 'vitest'
import { validateQueueConfig } from '../src/queue'

describe('queue/validateQueueConfig', () => {
  it('returns blocking error when qstash token is missing', () => {
    const result = validateQueueConfig({ name: 'qstash', destination: 'https://example.com/hook', token: '' as any })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'QSTASH_TOKEN_REQUIRED',
        severity: 'error',
      }),
    ])
  })

  it('returns blocking error when vercel topic is missing', () => {
    const result = validateQueueConfig({ name: 'vercel', topic: '' as any })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'VERCEL_TOPIC_REQUIRED',
        severity: 'error',
      }),
    ])
  })

  it('returns blocking error when cloudflare binding is missing', () => {
    const result = validateQueueConfig({ name: 'cloudflare', binding: undefined as any })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'CF_BINDING_REQUIRED',
        severity: 'error',
      }),
    ])
  })
})

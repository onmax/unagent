import { afterEach, describe, expect, it, vi } from 'vitest'

import { createQueue, verifyQStashSignature } from '../src/queue'

vi.mock('@upstash/qstash', () => {
  const verify = vi.fn(async () => true)
  class Receiver {
    verify = verify
    constructor(_opts: any) {}
  }
  return { Receiver, __verify: verify }
}, { virtual: true })

function getHeader(input: any, name: string): string | null {
  const headers = new Headers(input)
  return headers.get(name)
}

describe('queue/qstash provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends messages via fetch with mapped headers', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ messageId: 'msg-1' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const queue = await createQueue({
      provider: {
        name: 'qstash',
        token: 'token',
        destination: 'https://example.com/webhook',
      },
    })

    const res = await queue.send({ ok: true }, { idempotencyKey: 'k', delaySeconds: 10 })
    expect(res.messageId).toBe('msg-1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe(`https://qstash.upstash.io/v2/publish/${encodeURIComponent('https://example.com/webhook')}`)
    expect(getHeader((init as any).headers, 'authorization')).toBe('Bearer token')
    expect(getHeader((init as any).headers, 'upstash-deduplication-id')).toBe('k')
    expect(getHeader((init as any).headers, 'upstash-delay')).toBe('10s')
  })

  it('sends batches via /v2/batch', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ messageId: 'msg-1' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const queue = await createQueue({
      provider: {
        name: 'qstash',
        token: 'token',
        destination: 'https://example.com/webhook',
      },
    })

    await queue.sendBatch?.([{ body: { a: 1 }, contentType: 'json' }], { delaySeconds: 5 })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/v2/batch')
    expect(getHeader((init as any).headers, 'authorization')).toBe('Bearer token')

    const body = JSON.parse((init as any).body)
    expect(body[0].destination).toBe('https://example.com/webhook')
    expect(body[0].headers['upstash-delay']).toBe('5s')
  })
})

describe('queue/qstash signature verify', () => {
  it('delegates to @upstash/qstash Receiver', async () => {
    const req = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: {
        'Upstash-Signature': 'sig',
      },
    })

    const mod: any = await import('@upstash/qstash')
    const ok = await verifyQStashSignature(req, {
      currentSigningKey: 'cur',
      nextSigningKey: 'next',
      body: '{"ok":true}',
    })

    expect(ok).toBe(true)
    expect(mod.__verify).toHaveBeenCalledWith({ body: '{"ok":true}', signature: 'sig', url: 'https://example.com/webhook' })
  })
})

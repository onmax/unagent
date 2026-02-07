import { describe, expect, it, vi } from 'vitest'

import { createQueue } from '../src/queue'

const send = vi.fn(async () => ({ messageId: 'm1' }))
const receive = vi.fn(async () => {})
const handleCallback = vi.fn(() => async (_req: Request) => new Response('ok'))
const parseCallback = vi.fn(async (_req: Request) => ({ queueName: 't', consumerGroup: 'cg', messageId: 'mid' }))

vi.mock('@vercel/queue', () => {
  return {
    send,
    receive,
    handleCallback,
    parseCallback,
  }
})

describe('queue/vercel namespace helpers', () => {
  it('binds receive() to the configured topic', async () => {
    const queue = await createQueue({ provider: { name: 'vercel', topic: 'my-topic' } })
    const handler = vi.fn(async () => {})

    await queue.vercel.receive('my-consumer', handler, { visibilityTimeoutSeconds: 60 } as any)
    expect(receive).toHaveBeenCalledWith('my-topic', 'my-consumer', handler, { visibilityTimeoutSeconds: 60 })
  })

  it('wraps handleCallback() for a single topic', async () => {
    const queue = await createQueue({ provider: { name: 'vercel', topic: 'my-topic' } })
    const handler = vi.fn(async () => {})

    const routeHandler = queue.vercel.handleCallback({ myConsumer: handler })
    expect(handleCallback).toHaveBeenCalledWith({ 'my-topic': { myConsumer: handler } }, undefined)

    const res = await routeHandler(new Request('https://example.com', { method: 'POST' }))
    expect(res.status).toBe(200)
  })

  it('proxies parseCallback()', async () => {
    const queue = await createQueue({ provider: { name: 'vercel', topic: 'my-topic' } })
    const req = new Request('https://example.com', { method: 'POST' })
    const parsed = await queue.vercel.parseCallback(req)
    expect(parseCallback).toHaveBeenCalledWith(req)
    expect(parsed.messageId).toBe('mid')
  })
})

import type { CloudflareQueueBindingLike } from '../src/queue/types/cloudflare'
import { describe, expect, it, vi } from 'vitest'

import { CloudflareQueueAdapter } from '../src/queue/adapters/cloudflare'
import { VercelQueueAdapter } from '../src/queue/adapters/vercel'

describe('queue adapters (cloudflare)', () => {
  it('sends and batches messages via binding', async () => {
    const binding: CloudflareQueueBindingLike = {
      send: vi.fn(async () => {}),
      sendBatch: vi.fn(async () => {}),
    }

    const adapter = new CloudflareQueueAdapter(binding)
    await adapter.send({ hello: 'world' }, { contentType: 'json' })
    expect(binding.send).toHaveBeenCalledWith({ hello: 'world' }, { contentType: 'json' })

    await adapter.sendBatch([{ body: 'hello', contentType: 'text' }], { delaySeconds: 10 })
    expect(binding.sendBatch).toHaveBeenCalledWith([{ body: 'hello', contentType: 'text' }], { delaySeconds: 10 })

    expect(adapter.cloudflare.binding).toBe(binding)
  })
})

describe('queue adapters (vercel)', () => {
  it('sends messages with a bound topic', async () => {
    const send = vi.fn(async () => ({ messageId: 'msg-1' }))
    const sdk = { send }
    const adapter = new VercelQueueAdapter('my-topic', send, sdk)

    const res = await adapter.send({ ok: true }, { delaySeconds: 5, contentType: 'json' })
    expect(res.messageId).toBe('msg-1')
    expect(send).toHaveBeenCalledWith('my-topic', { ok: true }, { delaySeconds: 5 })

    expect(adapter.vercel.topic).toBe('my-topic')
    expect(adapter.vercel.native).toBe(sdk)
  })
})

import { describe, expect, it, vi } from 'vitest'

import { createCloudflareQueueBatchHandler } from '../src/queue'

function createMessage<T>(body: T) {
  return {
    id: 'msg',
    timestamp: new Date(),
    body,
    attempts: 1,
    ack: vi.fn(),
    retry: vi.fn(),
  }
}

describe('queue/cloudflare consumer helpers', () => {
  it('acks messages on success', async () => {
    const m1 = createMessage({ a: 1 })
    const m2 = createMessage({ a: 2 })
    const batch = {
      queue: 'q',
      messages: [m1, m2],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    }

    const handler = createCloudflareQueueBatchHandler({
      onMessage: vi.fn(async () => {}),
    })

    await handler(batch as any)
    expect(m1.ack).toHaveBeenCalledTimes(1)
    expect(m2.ack).toHaveBeenCalledTimes(1)
    expect(m1.retry).toHaveBeenCalledTimes(0)
  })

  it('retries messages on error by default', async () => {
    const m1 = createMessage({ a: 1 })
    const batch = {
      queue: 'q',
      messages: [m1],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    }

    const handler = createCloudflareQueueBatchHandler({
      onMessage: vi.fn(async () => {
        throw new Error('boom')
      }),
    })

    await handler(batch as any)
    expect(m1.ack).toHaveBeenCalledTimes(0)
    expect(m1.retry).toHaveBeenCalledTimes(1)
  })

  it('supports onError override (ack)', async () => {
    const m1 = createMessage({ a: 1 })
    const batch = {
      queue: 'q',
      messages: [m1],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    }

    const handler = createCloudflareQueueBatchHandler({
      onMessage: vi.fn(async () => {
        throw new Error('boom')
      }),
      onError: () => 'ack',
    })

    await handler(batch as any)
    expect(m1.ack).toHaveBeenCalledTimes(1)
    expect(m1.retry).toHaveBeenCalledTimes(0)
  })

  it('supports onError override (retry with options)', async () => {
    const m1 = createMessage({ a: 1 })
    const batch = {
      queue: 'q',
      messages: [m1],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    }

    const handler = createCloudflareQueueBatchHandler({
      onMessage: vi.fn(async () => {
        throw new Error('boom')
      }),
      onError: () => ({ retry: { delaySeconds: 10 } }),
    })

    await handler(batch as any)
    expect(m1.ack).toHaveBeenCalledTimes(0)
    expect(m1.retry).toHaveBeenCalledWith({ delaySeconds: 10 })
  })
})

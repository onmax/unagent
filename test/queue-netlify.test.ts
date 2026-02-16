import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createQueue } from '../src/queue'

const send = vi.fn(async () => ({ sendStatus: 'succeeded', eventId: 'evt-1' }))
const asyncWorkloadFn = vi.fn((fn: any) => fn)

class MockAsyncWorkloadsClient {
  constructor(_options?: Record<string, unknown>) {}

  send = send
}

class ErrorDoNotRetry extends Error {}
class ErrorRetryAfterDelay extends Error {}

vi.mock('@netlify/async-workloads', () => ({
  AsyncWorkloadsClient: MockAsyncWorkloadsClient,
  asyncWorkloadFn,
  ErrorDoNotRetry,
  ErrorRetryAfterDelay,
}), { virtual: true })

describe('queue/netlify provider', () => {
  beforeEach(() => {
    send.mockClear()
    asyncWorkloadFn.mockClear()
  })

  it('sends messages using the configured event', async () => {
    const queue = await createQueue({
      provider: {
        name: 'netlify',
        event: 'emails.send',
      },
    })

    const result = await queue.send({ to: 'hello@example.com' }, { delaySeconds: 5, priority: 10 })

    expect(result).toEqual({ messageId: 'evt-1', sendStatus: 'succeeded' })
    expect(send).toHaveBeenCalledWith('emails.send', {
      data: { to: 'hello@example.com' },
      delayUntil: 5000,
      priority: 10,
    })
  })

  it('prefers delayUntil over delaySeconds', async () => {
    const queue = await createQueue({
      provider: {
        name: 'netlify',
        event: 'emails.send',
      },
    })

    await queue.send(
      { to: 'hello@example.com' },
      { delaySeconds: 5, delayUntil: '2026-02-16T12:00:00Z' },
    )

    expect(send).toHaveBeenLastCalledWith('emails.send', {
      data: { to: 'hello@example.com' },
      delayUntil: '2026-02-16T12:00:00Z',
    })
  })

  it('exposes netlify namespace helpers', async () => {
    const queue = await createQueue({
      provider: {
        name: 'netlify',
        event: 'default.event',
      },
    })

    const response = await queue.netlify.send('custom.event', {
      data: { id: 1 },
      delaySeconds: 2,
      priority: -1,
    })

    expect(response).toEqual({ messageId: 'evt-1', sendStatus: 'succeeded' })
    expect(send).toHaveBeenLastCalledWith('custom.event', {
      data: { id: 1 },
      delayUntil: 2000,
      priority: -1,
    })
    expect(queue.netlify.event).toBe('default.event')
    expect(queue.netlify.asyncWorkloadFn).toBe(asyncWorkloadFn)
    expect(queue.netlify.ErrorDoNotRetry).toBe(ErrorDoNotRetry)
    expect(queue.netlify.ErrorRetryAfterDelay).toBe(ErrorRetryAfterDelay)
  })

  it('supports injecting a custom AsyncWorkloads client', async () => {
    const customSend = vi.fn(async () => ({ sendStatus: 'succeeded', eventId: 'evt-custom' }))
    const queue = await createQueue({
      provider: {
        name: 'netlify',
        event: 'custom.injected',
        client: { send: customSend },
      },
    })

    const result = await queue.send({ ok: true })
    expect(result).toEqual({ messageId: 'evt-custom', sendStatus: 'succeeded' })
    expect(customSend).toHaveBeenCalledWith('custom.injected', { data: { ok: true } })
  })

  it('throws when upstream send reports failed status', async () => {
    send.mockResolvedValueOnce({ sendStatus: 'failed', eventId: 'evt-failed' })
    const queue = await createQueue({
      provider: {
        name: 'netlify',
        event: 'emails.send',
      },
    })

    await expect(queue.send({ hello: 'world' })).rejects.toMatchObject({
      name: 'QueueError',
      code: 'NETLIFY_SEND_FAILED',
      provider: 'netlify',
    })
  })

  it('does not support sendBatch()', async () => {
    const queue = await createQueue({
      provider: {
        name: 'netlify',
        event: 'emails.send',
      },
    })

    await expect(queue.sendBatch?.([{ body: { hello: 'world' } }])).rejects.toMatchObject({
      name: 'NotSupportedError',
      code: 'NOT_SUPPORTED',
    })
  })
})

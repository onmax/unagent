import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createJobs } from '../src/jobs'

const send = vi.fn(async () => ({ sendStatus: 'succeeded', eventId: 'evt-1' }))
const asyncWorkloadFn = vi.fn((fn: any) => {
  return async (event: unknown) => {
    await fn(event)
  }
})

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

describe('jobs/netlify provider', () => {
  beforeEach(() => {
    send.mockClear()
    asyncWorkloadFn.mockClear()
  })

  it('enqueues envelopes for a named job', async () => {
    const jobs = await createJobs({
      provider: { name: 'netlify', event: 'jobs.event' },
      jobs: {
        'demo:job': {
          run: () => ({ result: true }),
        },
      },
    })

    const result = await jobs.enqueue('demo:job', { hello: 'world' }, { delaySeconds: 2, priority: 1 })

    expect(result).toEqual({ messageId: 'evt-1', sendStatus: 'succeeded' })
    expect(send).toHaveBeenCalledWith('jobs.event', {
      data: expect.objectContaining({
        job: 'demo:job',
        payload: { hello: 'world' },
      }),
      delayUntil: 2000,
      priority: 1,
    })
  })

  it('prefers delayUntil over delaySeconds for enqueue', async () => {
    const jobs = await createJobs({
      provider: { name: 'netlify', event: 'jobs.event' },
      jobs: {
        'demo:job': {
          run: () => ({ result: true }),
        },
      },
    })

    await jobs.enqueue('demo:job', { hello: 'world' }, {
      delaySeconds: 5,
      delayUntil: '2026-02-16T12:00:00Z',
    })

    expect(send).toHaveBeenLastCalledWith('jobs.event', {
      data: expect.objectContaining({
        job: 'demo:job',
      }),
      delayUntil: '2026-02-16T12:00:00Z',
    })
  })

  it('rejects enqueue for unknown jobs', async () => {
    const jobs = await createJobs({
      provider: { name: 'netlify', event: 'jobs.event' },
      jobs: {
        'demo:job': {
          run: () => ({ result: true }),
        },
      },
    })

    await expect(jobs.enqueue('missing:job', { hello: 'world' })).rejects.toMatchObject({
      name: 'JobsError',
      code: 'JOB_NOT_REGISTERED',
      provider: 'netlify',
    })
  })

  it('routes provider events through netlify handler with context', async () => {
    const run = vi.fn(async event => ({ result: event.context }))

    const jobs = await createJobs({
      provider: { name: 'netlify', event: 'jobs.event' },
      jobs: {
        'demo:job': {
          run,
        },
      },
    })

    await jobs.netlify.handler({
      eventName: 'jobs.event',
      eventId: 'evt-ctx',
      eventData: {
        job: 'demo:job',
        payload: { hello: 'handler' },
        enqueuedAt: '2026-02-16T11:00:00.000Z',
      },
      attempt: 3,
    })

    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith(expect.objectContaining({
      name: 'demo:job',
      payload: { hello: 'handler' },
      context: {
        netlify: {
          eventName: 'jobs.event',
          eventId: 'evt-ctx',
          attempt: 3,
        },
      },
    }))
  })

  it('throws when handler receives unknown job in envelope', async () => {
    const jobs = await createJobs({
      provider: { name: 'netlify', event: 'jobs.event' },
      jobs: {
        'demo:job': {
          run: () => ({ result: true }),
        },
      },
    })

    await expect(jobs.netlify.handler({
      eventName: 'jobs.event',
      eventId: 'evt-missing',
      eventData: {
        job: 'missing:job',
        payload: { hello: 'handler' },
        enqueuedAt: '2026-02-16T11:00:00.000Z',
      },
      attempt: 1,
    })).rejects.toMatchObject({
      name: 'JobsError',
      code: 'JOB_NOT_REGISTERED',
      provider: 'netlify',
    })
  })

  it('exposes netlify namespace helpers', async () => {
    const jobs = await createJobs({
      provider: { name: 'netlify', event: 'jobs.event' },
      jobs: {
        'demo:job': {
          run: () => ({ result: true }),
        },
      },
    })

    const response = await jobs.netlify.sendEnvelope({
      job: 'demo:job',
      payload: { ok: true },
      enqueuedAt: '2026-02-16T12:00:00.000Z',
    }, { delayUntil: 5000, priority: -1 })

    expect(response).toEqual({ messageId: 'evt-1', sendStatus: 'succeeded' })
    expect(jobs.netlify.event).toBe('jobs.event')
    expect(jobs.netlify.asyncWorkloadFn).toBe(asyncWorkloadFn)
    expect(jobs.netlify.ErrorDoNotRetry).toBe(ErrorDoNotRetry)
    expect(jobs.netlify.ErrorRetryAfterDelay).toBe(ErrorRetryAfterDelay)
  })
})

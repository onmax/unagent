import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlaygroundQueue, getPlaygroundNetlifyQueueConfig, NETLIFY_QUEUE_DEFAULT_EVENT } from '../playground/server/_shared/queue'

let createQueueMock: ReturnType<typeof vi.fn>

vi.mock('unagent/queue', () => ({
  createQueue: (...args: any[]) => {
    if (!createQueueMock)
      createQueueMock = vi.fn(async (options: any) => ({ provider: options.provider }))
    return createQueueMock(...args)
  },
}))

describe('playground netlify queue config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    createQueueMock = vi.fn(async (options: any) => ({ provider: options.provider }))
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does not use request origin as Netlify baseUrl fallback', async () => {
    process.env.NETLIFY_QUEUE_EVENT = 'playground.send'
    process.env.NETLIFY_API_KEY = 'api-key'
    delete process.env.NETLIFY_ASYNC_WORKLOADS_BASE_URL

    await createPlaygroundQueue({}, 'netlify')

    expect(createQueueMock).toHaveBeenCalledOnce()
    expect(createQueueMock.mock.calls[0][0]).toMatchObject({
      provider: {
        name: 'netlify',
        event: 'playground.send',
        apiKey: 'api-key',
      },
    })
    expect(createQueueMock.mock.calls[0][0].provider).not.toHaveProperty('baseUrl')
  })

  it('forwards NETLIFY_ASYNC_WORKLOADS_BASE_URL when set', async () => {
    process.env.NETLIFY_QUEUE_EVENT = 'playground.send'
    process.env.NETLIFY_ASYNC_WORKLOADS_BASE_URL = 'https://custom-functions.example.net'

    await createPlaygroundQueue({}, 'netlify')

    expect(createQueueMock).toHaveBeenCalledOnce()
    expect(createQueueMock.mock.calls[0][0]).toMatchObject({
      provider: {
        name: 'netlify',
        event: 'playground.send',
        baseUrl: 'https://custom-functions.example.net',
      },
    })
  })

  it('reads event from NETLIFY_QUEUE_EVENT with a default fallback', () => {
    process.env.NETLIFY_QUEUE_EVENT = '   playground.event  '
    expect(getPlaygroundNetlifyQueueConfig().event).toBe('playground.event')

    delete process.env.NETLIFY_QUEUE_EVENT
    expect(getPlaygroundNetlifyQueueConfig().event).toBe(NETLIFY_QUEUE_DEFAULT_EVENT)
  })
})

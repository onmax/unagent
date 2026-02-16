import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlaygroundJobs, getPlaygroundNetlifyJobsConfig, NETLIFY_JOBS_DEFAULT_EVENT, PLAYGROUND_RECEIPT_JOB } from '../playground/server/_shared/jobs'

let createJobsMock: ReturnType<typeof vi.fn>

vi.mock('unagent/jobs', () => ({
  createJobs: (...args: any[]) => {
    if (!createJobsMock)
      createJobsMock = vi.fn(async (options: any) => ({ provider: options.provider.name, supports: { enqueue: true, providerHandler: true }, listJobs: () => Object.keys(options.jobs).map(name => ({ name })) }))
    return createJobsMock(...args)
  },
}))

describe('playground netlify jobs config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    createJobsMock = vi.fn(async (options: any) => ({ provider: options.provider.name, supports: { enqueue: true, providerHandler: true }, listJobs: () => Object.keys(options.jobs).map(name => ({ name })) }))
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does not use request origin as Netlify baseUrl fallback', async () => {
    process.env.NETLIFY_JOBS_EVENT = 'playground.jobs'
    process.env.NETLIFY_API_KEY = 'api-key'
    delete process.env.NETLIFY_ASYNC_WORKLOADS_BASE_URL

    await createPlaygroundJobs('netlify')

    expect(createJobsMock).toHaveBeenCalledOnce()
    expect(createJobsMock.mock.calls[0][0]).toMatchObject({
      provider: {
        name: 'netlify',
        event: 'playground.jobs',
        apiKey: 'api-key',
      },
    })
    expect(createJobsMock.mock.calls[0][0].provider).not.toHaveProperty('baseUrl')
  })

  it('forwards NETLIFY_ASYNC_WORKLOADS_BASE_URL when set', async () => {
    process.env.NETLIFY_JOBS_EVENT = 'playground.jobs'
    process.env.NETLIFY_ASYNC_WORKLOADS_BASE_URL = 'https://custom-functions.example.net'

    await createPlaygroundJobs('netlify')

    expect(createJobsMock).toHaveBeenCalledOnce()
    expect(createJobsMock.mock.calls[0][0]).toMatchObject({
      provider: {
        name: 'netlify',
        event: 'playground.jobs',
        baseUrl: 'https://custom-functions.example.net',
      },
    })
  })

  it('reads event from NETLIFY_JOBS_EVENT with a default fallback', () => {
    process.env.NETLIFY_JOBS_EVENT = '   playground.jobs.event  '
    expect(getPlaygroundNetlifyJobsConfig().event).toBe('playground.jobs.event')

    delete process.env.NETLIFY_JOBS_EVENT
    expect(getPlaygroundNetlifyJobsConfig().event).toBe(NETLIFY_JOBS_DEFAULT_EVENT)
  })

  it('registers the default playground receipt job', async () => {
    await createPlaygroundJobs('netlify')
    const firstCall = createJobsMock.mock.calls[0]?.[0]
    expect(firstCall?.jobs?.[PLAYGROUND_RECEIPT_JOB]).toBeTruthy()
  })
})

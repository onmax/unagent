import type { Job } from 'unagent/jobs'
import { createJobs } from 'unagent/jobs'

export type JobsProvider = 'netlify'

export const NETLIFY_JOBS_EVENT_ENV = 'NETLIFY_JOBS_EVENT'
export const NETLIFY_JOBS_DEFAULT_EVENT = 'unagent.playground.jobs'
export const PLAYGROUND_RECEIPT_JOB = 'playground:receipt'

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function getPlaygroundNetlifyJobsConfig(): { event: string, baseUrl?: string } {
  const event = (process.env[NETLIFY_JOBS_EVENT_ENV] || NETLIFY_JOBS_DEFAULT_EVENT).trim()
  const baseUrl = process.env.NETLIFY_ASYNC_WORKLOADS_BASE_URL

  return {
    event: event || NETLIFY_JOBS_DEFAULT_EVENT,
    ...(baseUrl ? { baseUrl } : {}),
  }
}

export function createPlaygroundJobHandlers(): Record<string, Job> {
  return {
    [PLAYGROUND_RECEIPT_JOB]: {
      meta: {
        name: PLAYGROUND_RECEIPT_JOB,
        description: 'Write deterministic E2E receipts from the Netlify jobs worker',
      },
      async run(event) {
        const payload = toObject(event.payload)
        return {
          result: {
            ok: true,
            runId: payload.runId,
            ts: Date.now(),
          },
        }
      },
    },
  }
}

export async function createPlaygroundJobs(provider: JobsProvider): Promise<{ provider: JobsProvider, jobs: Awaited<ReturnType<typeof createJobs>> }> {
  if (provider !== 'netlify')
    throw new Error(`Unsupported jobs provider: ${provider}`)

  const config = getPlaygroundNetlifyJobsConfig()
  const apiKey = process.env.NETLIFY_API_KEY || process.env.NETLIFY_AUTH_TOKEN

  return {
    provider,
    jobs: await createJobs({
      jobs: createPlaygroundJobHandlers(),
      provider: {
        name: 'netlify',
        event: config.event,
        ...(apiKey ? { apiKey } : {}),
        ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
      },
    }),
  }
}

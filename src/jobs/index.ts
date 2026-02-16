import type { RunTaskOptions } from '../task/types'
import type { JobEnqueueOptions, JobEnqueueResult, JobEntry, JobListEntry, JobResult, JobsClient, JobsConfigValidationIssue, JobsConfigValidationResult, JobsDetectionResult, JobsOptions, JobsProvider, JobsProviderOptions, RunJobOptions } from './types'
import type { NetlifyJobsProviderOptions, NetlifyJobsSDK } from './types/netlify'
import { provider as envProvider } from 'std-env'
import { createTaskRunner } from '../task'
import { NetlifyJobsAdapter } from './adapters'
import { JobsError } from './errors'

export { JobsError, NotSupportedError } from './errors'
export type { JobsClient } from './types'
export type { Job, JobEnqueueOptions, JobEnqueueResult, JobEntry, JobEvent, JobListEntry, JobMeta, JobResult, JobsCapabilities, JobsConfigValidationIssue, JobsConfigValidationResult, JobsDetectionResult, JobsOptions, JobsProvider, JobsProviderOptions, MaybePromise, NetlifyJobsClient, RunJobOptions } from './types'
export type { NetlifyAsyncWorkloadEvent, NetlifyAsyncWorkloadsClient, NetlifyClientConstructorOptions, NetlifyJobContext, NetlifyJobsNamespace, NetlifyJobsProviderOptions, NetlifyJobsSDK, NetlifyJobsSendEventOptions, NetlifyJobsSendEventResult } from './types/netlify'

function hasJobs(jobs: Record<string, JobEntry>): boolean {
  return Object.keys(jobs).length > 0
}

export function detectJobs(): JobsDetectionResult {
  if (envProvider === 'netlify')
    return { type: 'netlify', details: { context: (typeof process !== 'undefined' ? process.env.CONTEXT : undefined) } }

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>
  if (env.NETLIFY || env.NETLIFY_LOCAL)
    return { type: 'netlify', details: { context: env.CONTEXT } }

  return { type: 'none' }
}

function canResolve(moduleName: string): boolean {
  try {
    const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
    if (!resolver)
      throw new Error('no-require-resolve')
    resolver(moduleName)
    return true
  }
  catch {
    try {
      const resolver = (import.meta as { resolve?: (id: string) => string }).resolve
      if (typeof resolver !== 'function')
        return false
      resolver(moduleName)
      return true
    }
    catch {
      return false
    }
  }
}

export function isJobsAvailable(provider: JobsProvider): boolean {
  if (provider === 'netlify')
    return canResolve('@netlify/async-workloads')

  return false
}

export function validateJobsConfig(provider: JobsProviderOptions, jobs: Record<string, JobEntry> = {}): JobsConfigValidationResult {
  const issues: JobsConfigValidationIssue[] = []

  if (!hasJobs(jobs)) {
    issues.push({
      code: 'JOBS_REQUIRED',
      field: 'jobs',
      message: 'At least one job handler is required.',
      severity: 'error',
    })
  }

  if (provider.name === 'netlify' && !provider.event) {
    issues.push({
      code: 'NETLIFY_EVENT_REQUIRED',
      field: 'event',
      message: 'Netlify jobs event is required.',
      severity: 'error',
    })
  }

  return {
    provider: provider.name,
    ok: issues.every(issue => issue.severity !== 'error'),
    issues,
  }
}

async function loadNetlifyJobs(): Promise<NetlifyJobsSDK> {
  const moduleName = '@netlify/async-workloads'
  try {
    return await import('@netlify/async-workloads') as NetlifyJobsSDK
  }
  catch (error) {
    throw new JobsError(`${moduleName} load failed. Install it to use the Netlify jobs provider. Original error: ${error instanceof Error ? error.message : error}`)
  }
}

function resolveProvider(provider?: JobsProviderOptions): JobsProviderOptions {
  if (provider)
    return provider

  if (envProvider === 'netlify')
    return { name: 'netlify', event: undefined as unknown as NetlifyJobsProviderOptions['event'] }

  if (typeof process !== 'undefined') {
    if (process.env.NETLIFY || process.env.NETLIFY_LOCAL)
      return { name: 'netlify', event: undefined as unknown as NetlifyJobsProviderOptions['event'] }
  }

  throw new JobsError('Unable to auto-detect jobs provider. Pass { provider }.')
}

export function createJobs(options: { jobs: Record<string, JobEntry>, provider: NetlifyJobsProviderOptions }): Promise<JobsClient<'netlify'>>
export function createJobs(options: JobsOptions): Promise<JobsClient>
export async function createJobs(options: JobsOptions): Promise<JobsClient> {
  if (!options || typeof options !== 'object')
    throw new JobsError('createJobs options are required')

  const jobs = options.jobs || {}
  const resolved = resolveProvider(options.provider)

  const validation = validateJobsConfig(resolved, jobs)
  if (!validation.ok) {
    const firstIssue = validation.issues.find(issue => issue.severity === 'error') || validation.issues[0]
    throw new JobsError(firstIssue?.message || 'Invalid jobs config', {
      code: firstIssue?.code || 'JOBS_CONFIG_INVALID',
      provider: resolved.name,
      httpStatus: 400,
      details: { issues: validation.issues },
    })
  }

  const runner = createTaskRunner({
    tasks: jobs,
  })

  if (resolved.name === 'netlify') {
    const sdk = await loadNetlifyJobs()
    const adapter = new NetlifyJobsAdapter({
      provider: resolved,
      sdk,
      hasJob: name => Boolean(jobs[name]),
      runJob: async (name, runOptions = {}) => {
        return await runner.runTask(name, runOptions as RunTaskOptions)
      },
    })

    return {
      provider: adapter.provider,
      supports: adapter.supports,
      enqueue: async <T = unknown>(name: string, payload: T, enqueueOptions: JobEnqueueOptions = {}): Promise<JobEnqueueResult> => {
        if (!jobs[name]) {
          throw new JobsError(`Job "${name}" is not registered`, {
            code: 'JOB_NOT_REGISTERED',
            provider: adapter.provider,
            httpStatus: 400,
            details: { job: name },
          })
        }

        return await adapter.enqueueEnvelope({
          job: name,
          payload,
          enqueuedAt: new Date().toISOString(),
        }, enqueueOptions)
      },
      run: async (name: string, runOptions: RunJobOptions = {}): Promise<JobResult> => {
        if (!jobs[name]) {
          throw new JobsError(`Job "${name}" is not registered`, {
            code: 'JOB_NOT_REGISTERED',
            provider: adapter.provider,
            httpStatus: 400,
            details: { job: name },
          })
        }

        return await runner.runTask(name, runOptions as RunTaskOptions)
      },
      listJobs: (): JobListEntry[] => {
        return runner.listTasks()
      },
      get netlify() {
        return adapter.netlify
      },
    }
  }

  throw new JobsError(`Unknown jobs provider: ${(resolved as { name: string }).name}`)
}

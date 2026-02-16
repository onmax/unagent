import type { Promisable } from 'type-fest'
import type { NetlifyJobsProviderOptions } from './netlify'

export type JobsProvider = 'netlify'

export interface JobMeta {
  name?: string
  description?: string
}

export interface JobEvent<TPayload = Record<string, unknown>> {
  name: string
  payload: TPayload
  context: Record<string, unknown>
}

export interface JobResult<T = unknown> {
  result?: T
}

export type JobPromisable<T> = Promisable<T>
export type MaybePromise<T> = JobPromisable<T>

export interface Job<T = unknown, TPayload = Record<string, unknown>> {
  meta?: JobMeta
  run: (event: JobEvent<TPayload>) => JobPromisable<JobResult<T>>
}

export type JobEntry<T = unknown, TPayload = Record<string, unknown>> = Job<T, TPayload> | { resolve: () => Promise<Job<T, TPayload>>, meta?: JobMeta }

export interface JobEnvelope {
  job: string
  payload: unknown
  enqueuedAt: string
}

export interface JobEnqueueOptions {
  idempotencyKey?: string
  delaySeconds?: number
  delayUntil?: number | string
  priority?: number
}

export interface JobEnqueueResult {
  messageId?: string
  sendStatus?: 'succeeded' | 'failed'
}

export interface RunJobOptions {
  payload?: Record<string, unknown>
  context?: Record<string, unknown>
  dedupe?: boolean
  dedupeKey?: string
  dedupeContext?: boolean
}

export interface JobsCapabilities {
  enqueue: boolean
  providerHandler: boolean
}

export interface JobListEntry {
  name: string
  meta?: JobMeta
}

export interface JobsConfigValidationIssue {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning'
}

export interface JobsConfigValidationResult {
  provider: JobsProvider
  ok: boolean
  issues: JobsConfigValidationIssue[]
}

export interface JobsDetectionResult {
  type: JobsProvider | 'none'
  details?: Record<string, unknown>
}

export type JobsProviderOptions = NetlifyJobsProviderOptions

export interface JobsOptions {
  jobs: Record<string, JobEntry>
  provider?: JobsProviderOptions
}

import type { JobEnqueueOptions, JobEnqueueResult, JobListEntry, JobResult, JobsCapabilities, JobsProvider, RunJobOptions } from './common'
import type { NetlifyJobsNamespace } from './netlify'

export type * from './common'
export type * from './netlify'

export interface JobsClient<P extends JobsProvider = JobsProvider> {
  readonly provider: P
  readonly supports: JobsCapabilities

  enqueue: <T = unknown>(name: string, payload: T, options?: JobEnqueueOptions) => Promise<JobEnqueueResult>
  run: (name: string, options?: RunJobOptions) => Promise<JobResult>
  listJobs: () => JobListEntry[]

  readonly netlify: P extends 'netlify' ? NetlifyJobsNamespace : never
}

export type NetlifyJobsClient = JobsClient<'netlify'>

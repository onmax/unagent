import type { JobEnqueueOptions, JobEnqueueResult, JobEnvelope, JobsCapabilities, JobsProvider } from '../types/common'
import type { NetlifyJobsNamespace } from '../types/netlify'
import { NotSupportedError } from '../errors'

export abstract class BaseJobsAdapter {
  abstract readonly provider: JobsProvider
  abstract readonly supports: JobsCapabilities

  abstract enqueueEnvelope(envelope: JobEnvelope, options?: JobEnqueueOptions): Promise<JobEnqueueResult>

  get netlify(): NetlifyJobsNamespace {
    throw new NotSupportedError('netlify namespace', this.provider)
  }
}

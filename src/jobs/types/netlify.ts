import type {
  NetlifyAsyncWorkloadEvent,
  NetlifyAsyncWorkloadsClient,
  NetlifySdk,
  NetlifySendEventOptions,
} from '../../_internal/netlify-types'
import type { JobEnqueueResult, JobEnvelope } from './common'

export type {
  NetlifyAsyncWorkloadsClient as NetlifyJobsAsyncWorkloadsClient,
  NetlifyAsyncWorkloadsClientConstructor as NetlifyJobsAsyncWorkloadsClientConstructor,
  NetlifyClientConstructorOptions as NetlifyJobsClientConstructorOptions,
  NetlifySdk as NetlifyJobsSDK,
  NetlifySendEventOptions as NetlifyJobsSendEventOptions,
  NetlifySendEventResult as NetlifyJobsSendEventResult,
} from '../../_internal/netlify-types'
export type { NetlifyAsyncWorkloadEvent }

export interface NetlifyAsyncWorkloadFunction {
  (event: NetlifyAsyncWorkloadEvent): Promise<void> | void
}

export interface NetlifyJobsProviderOptions {
  name: 'netlify'
  event: string
  baseUrl?: string
  apiKey?: string
  client?: NetlifyAsyncWorkloadsClient
}

export interface NetlifyJobContext {
  eventName: string
  eventId: string
  attempt: number
}

export interface NetlifyJobsNamespace {
  readonly event: string
  readonly native: NetlifyAsyncWorkloadsClient
  readonly handler: (...args: unknown[]) => Promise<Response | void>
  readonly asyncWorkloadFn: NetlifySdk['asyncWorkloadFn']
  readonly ErrorDoNotRetry: NetlifySdk['ErrorDoNotRetry']
  readonly ErrorRetryAfterDelay: NetlifySdk['ErrorRetryAfterDelay']
  readonly sendEnvelope: (envelope: JobEnvelope, options?: Omit<NetlifySendEventOptions, 'data'>) => Promise<JobEnqueueResult>
}

import type {
  NetlifyAsyncWorkloadsClientConstructorLike,
  NetlifyAsyncWorkloadsClientLike,
  NetlifyClientConstructorOptionsLike,
  NetlifySdkLike,
  NetlifySendEventOptionsLike,
  NetlifySendEventResultLike,
} from '../../_internal/netlify-structural-types'
import type { JobEnqueueResult, JobEnvelope } from './common'

export type NetlifyClientConstructorOptions = NetlifyClientConstructorOptionsLike

export type NetlifyJobsSendEventOptions = NetlifySendEventOptionsLike

export type NetlifyJobsSendEventResult = NetlifySendEventResultLike

export type NetlifyAsyncWorkloadsClient = NetlifyAsyncWorkloadsClientLike

export type NetlifyAsyncWorkloadsClientConstructor = NetlifyAsyncWorkloadsClientConstructorLike

export interface NetlifyAsyncWorkloadEvent {
  eventName: string
  eventId: string
  eventData?: unknown
  attempt?: number
  attemptContext?: {
    attempt?: number
  }
}

export interface NetlifyAsyncWorkloadFunction {
  (event: NetlifyAsyncWorkloadEvent): Promise<void> | void
}

export type NetlifyJobsSDK = NetlifySdkLike

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
  readonly asyncWorkloadFn: NetlifyJobsSDK['asyncWorkloadFn']
  readonly ErrorDoNotRetry: NetlifyJobsSDK['ErrorDoNotRetry']
  readonly ErrorRetryAfterDelay: NetlifyJobsSDK['ErrorRetryAfterDelay']
  readonly sendEnvelope: (envelope: JobEnvelope, options?: Omit<NetlifyJobsSendEventOptions, 'data'>) => Promise<JobEnqueueResult>
}

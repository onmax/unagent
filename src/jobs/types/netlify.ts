import type {
  NetlifyAsyncWorkloadEventLike,
  NetlifyAsyncWorkloadsClientConstructorLike,
  NetlifyAsyncWorkloadsClientLike,
  NetlifyClientConstructorOptionsLike,
  NetlifySdkLike,
  NetlifySendEventOptionsLike,
  NetlifySendEventResultLike,
} from '../../_internal/netlify-types'
import type { JobEnqueueResult, JobEnvelope } from './common'

export type NetlifyJobsClientConstructorOptions = NetlifyClientConstructorOptionsLike

export type NetlifyJobsSendEventOptions = NetlifySendEventOptionsLike

export type NetlifyJobsSendEventResult = NetlifySendEventResultLike

export type NetlifyJobsAsyncWorkloadsClient = NetlifyAsyncWorkloadsClientLike

export type NetlifyJobsAsyncWorkloadsClientConstructor = NetlifyAsyncWorkloadsClientConstructorLike

export interface NetlifyAsyncWorkloadEvent {
  eventName: NetlifyAsyncWorkloadEventLike['eventName']
  eventId: NetlifyAsyncWorkloadEventLike['eventId']
  eventData?: NetlifyAsyncWorkloadEventLike['eventData']
  attempt?: NetlifyAsyncWorkloadEventLike['attempt']
  attemptContext?: NetlifyAsyncWorkloadEventLike['attemptContext']
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
  client?: NetlifyJobsAsyncWorkloadsClient
}

export interface NetlifyJobContext {
  eventName: string
  eventId: string
  attempt: number
}

export interface NetlifyJobsNamespace {
  readonly event: string
  readonly native: NetlifyJobsAsyncWorkloadsClient
  readonly handler: (...args: unknown[]) => Promise<Response | void>
  readonly asyncWorkloadFn: NetlifyJobsSDK['asyncWorkloadFn']
  readonly ErrorDoNotRetry: NetlifyJobsSDK['ErrorDoNotRetry']
  readonly ErrorRetryAfterDelay: NetlifyJobsSDK['ErrorRetryAfterDelay']
  readonly sendEnvelope: (envelope: JobEnvelope, options?: Omit<NetlifyJobsSendEventOptions, 'data'>) => Promise<JobEnqueueResult>
}

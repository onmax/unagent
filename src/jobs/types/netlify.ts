import type { JobEnqueueResult, JobEnvelope } from './common'

export interface NetlifyClientConstructorOptions {
  baseUrl?: string
  apiKey?: string
}

export interface NetlifyJobsSendEventOptions {
  data?: unknown
  delayUntil?: number | string
  priority?: number
}

export interface NetlifyJobsSendEventResult {
  sendStatus: 'succeeded' | 'failed'
  eventId: string
}

export interface NetlifyAsyncWorkloadsClient {
  send: (eventName: string, options?: NetlifyJobsSendEventOptions) => Promise<NetlifyJobsSendEventResult>
}

export interface NetlifyAsyncWorkloadsClientConstructor {
  new (options?: NetlifyClientConstructorOptions): NetlifyAsyncWorkloadsClient
}

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

export interface NetlifyJobsSDK {
  AsyncWorkloadsClient: NetlifyAsyncWorkloadsClientConstructor
  asyncWorkloadFn: <T extends (...args: any[]) => any>(fn: T) => (...args: unknown[]) => Promise<Response | void>
  ErrorDoNotRetry: new (...args: any[]) => Error
  ErrorRetryAfterDelay: new (...args: any[]) => Error
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
  readonly asyncWorkloadFn: NetlifyJobsSDK['asyncWorkloadFn']
  readonly ErrorDoNotRetry: NetlifyJobsSDK['ErrorDoNotRetry']
  readonly ErrorRetryAfterDelay: NetlifyJobsSDK['ErrorRetryAfterDelay']
  readonly sendEnvelope: (envelope: JobEnvelope, options?: Omit<NetlifyJobsSendEventOptions, 'data'>) => Promise<JobEnqueueResult>
}

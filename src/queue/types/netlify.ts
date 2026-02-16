import type { QueueSendResult } from './common'

export interface NetlifyClientConstructorOptions {
  baseUrl?: string
  apiKey?: string
}

export interface NetlifyQueueSendEventOptions {
  data?: unknown
  delayUntil?: number | string
  priority?: number
}

export interface NetlifyQueueSendEventResult {
  sendStatus: 'succeeded' | 'failed'
  eventId: string
}

export interface NetlifyAsyncWorkloadsClient {
  send: (eventName: string, options?: NetlifyQueueSendEventOptions) => Promise<NetlifyQueueSendEventResult>
}

export interface NetlifyAsyncWorkloadsClientConstructor {
  new (options?: NetlifyClientConstructorOptions): NetlifyAsyncWorkloadsClient
}

export interface NetlifyQueueSDK {
  AsyncWorkloadsClient: NetlifyAsyncWorkloadsClientConstructor
  asyncWorkloadFn: <T extends (...args: any[]) => any>(fn: T) => (...args: unknown[]) => Promise<Response | void>
  ErrorDoNotRetry: new (...args: any[]) => Error
  ErrorRetryAfterDelay: new (...args: any[]) => Error
}

export interface NetlifyQueueProviderOptions {
  name: 'netlify'
  event: string
  baseUrl?: string
  apiKey?: string
  client?: NetlifyAsyncWorkloadsClient
}

export interface NetlifyQueueSendOptions {
  data?: unknown
  delaySeconds?: number
  delayUntil?: number | string
  priority?: number
}

export interface NetlifyQueueSendResult extends QueueSendResult {
  sendStatus?: 'succeeded' | 'failed'
}

export interface NetlifyQueueNamespace {
  readonly event: string
  readonly native: NetlifyAsyncWorkloadsClient
  readonly send: (eventName: string, options?: NetlifyQueueSendOptions) => Promise<NetlifyQueueSendResult>
  readonly asyncWorkloadFn: NetlifyQueueSDK['asyncWorkloadFn']
  readonly ErrorDoNotRetry: NetlifyQueueSDK['ErrorDoNotRetry']
  readonly ErrorRetryAfterDelay: NetlifyQueueSDK['ErrorRetryAfterDelay']
}

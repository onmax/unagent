import type {
  NetlifyAsyncWorkloadsClientConstructorLike,
  NetlifyAsyncWorkloadsClientLike,
  NetlifyClientConstructorOptionsLike,
  NetlifySdkLike,
  NetlifySendEventOptionsLike,
  NetlifySendEventResultLike,
} from '../../_internal/netlify-types'
import type { QueueSendResult } from './common'

export type NetlifyQueueClientConstructorOptions = NetlifyClientConstructorOptionsLike

export type NetlifyQueueSendEventOptions = NetlifySendEventOptionsLike

export type NetlifyQueueSendEventResult = NetlifySendEventResultLike

export type NetlifyQueueAsyncWorkloadsClient = NetlifyAsyncWorkloadsClientLike

export type NetlifyQueueAsyncWorkloadsClientConstructor = NetlifyAsyncWorkloadsClientConstructorLike

export type NetlifyQueueSDK = NetlifySdkLike

export interface NetlifyQueueProviderOptions {
  name: 'netlify'
  event: string
  baseUrl?: string
  apiKey?: string
  client?: NetlifyQueueAsyncWorkloadsClient
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
  readonly native: NetlifyQueueAsyncWorkloadsClient
  readonly send: (eventName: string, options?: NetlifyQueueSendOptions) => Promise<NetlifyQueueSendResult>
  readonly asyncWorkloadFn: NetlifyQueueSDK['asyncWorkloadFn']
  readonly ErrorDoNotRetry: NetlifyQueueSDK['ErrorDoNotRetry']
  readonly ErrorRetryAfterDelay: NetlifyQueueSDK['ErrorRetryAfterDelay']
}

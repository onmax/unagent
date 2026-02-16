import type {
  NetlifyAsyncWorkloadsClientConstructorLike,
  NetlifyAsyncWorkloadsClientLike,
  NetlifyClientConstructorOptionsLike,
  NetlifySdkLike,
  NetlifySendEventOptionsLike,
  NetlifySendEventResultLike,
} from '../../_internal/netlify-structural-types'
import type { QueueSendResult } from './common'

export type NetlifyClientConstructorOptions = NetlifyClientConstructorOptionsLike

export type NetlifyQueueSendEventOptions = NetlifySendEventOptionsLike

export type NetlifyQueueSendEventResult = NetlifySendEventResultLike

export type NetlifyAsyncWorkloadsClient = NetlifyAsyncWorkloadsClientLike

export type NetlifyAsyncWorkloadsClientConstructor = NetlifyAsyncWorkloadsClientConstructorLike

export type NetlifyQueueSDK = NetlifySdkLike

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

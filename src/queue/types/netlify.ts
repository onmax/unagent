import type {
  NetlifyAsyncWorkloadsClient,
  NetlifySdk,
} from '../../_internal/netlify-types'
import type { QueueSendResult } from './common'

export type {
  NetlifyAsyncWorkloadsClient as NetlifyQueueAsyncWorkloadsClient,
  NetlifyAsyncWorkloadsClientConstructor as NetlifyQueueAsyncWorkloadsClientConstructor,
  NetlifyClientConstructorOptions as NetlifyQueueClientConstructorOptions,
  NetlifySdk as NetlifyQueueSDK,
  NetlifySendEventOptions as NetlifyQueueSendEventOptions,
  NetlifySendEventResult as NetlifyQueueSendEventResult,
} from '../../_internal/netlify-types'

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
  readonly asyncWorkloadFn: NetlifySdk['asyncWorkloadFn']
  readonly ErrorDoNotRetry: NetlifySdk['ErrorDoNotRetry']
  readonly ErrorRetryAfterDelay: NetlifySdk['ErrorRetryAfterDelay']
}

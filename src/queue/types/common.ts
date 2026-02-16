import type { CloudflareQueueContentType, CloudflareQueueProviderOptions } from './cloudflare'
import type { MemoryQueueProviderOptions } from './memory'
import type { NetlifyQueueProviderOptions } from './netlify'
import type { QStashQueueProviderOptions } from './qstash'
import type { VercelQueueProviderOptions } from './vercel'

export type QueueProvider = 'vercel' | 'cloudflare' | 'qstash' | 'memory' | 'netlify'

export interface QueueCapabilities {
  sendBatch: boolean
}

export interface QueueSendOptions {
  idempotencyKey?: string
  retentionSeconds?: number
  delaySeconds?: number
  delayUntil?: number | string
  priority?: number
  contentType?: CloudflareQueueContentType
  transport?: unknown
  client?: unknown
}

export interface QueueSendResult {
  messageId?: string
  sendStatus?: 'succeeded' | 'failed'
}

export interface QueueBatchMessage<T = unknown> {
  body: T
  contentType?: CloudflareQueueContentType
}

export interface QueueSendBatchOptions {
  delaySeconds?: number
}

export interface QueueConfigValidationIssue {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning'
}

export interface QueueConfigValidationResult {
  provider: QueueProvider
  ok: boolean
  issues: QueueConfigValidationIssue[]
}

export type QueueProviderOptions = VercelQueueProviderOptions | CloudflareQueueProviderOptions | QStashQueueProviderOptions | MemoryQueueProviderOptions | NetlifyQueueProviderOptions

export interface QueueOptions {
  provider?: QueueProviderOptions
}

export interface QueueDetectionResult {
  type: QueueProvider | 'none'
  details?: Record<string, unknown>
}

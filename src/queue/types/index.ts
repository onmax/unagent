import type { CloudflareQueueNamespace } from './cloudflare'
import type { QueueBatchMessage, QueueCapabilities, QueueProvider, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from './common'
import type { MemoryQueueNamespace } from './memory'
import type { NetlifyQueueNamespace } from './netlify'
import type { QStashQueueNamespace } from './qstash'
import type { VercelQueueNamespace } from './vercel'

export type * from './cloudflare'
export type * from './common'
export type * from './memory'
export type * from './netlify'
export type * from './qstash'
export type * from './vercel'

export interface QueueClient<P extends QueueProvider = QueueProvider> {
  readonly provider: P
  readonly supports: QueueCapabilities

  send: <T = unknown>(payload: T, options?: QueueSendOptions) => Promise<QueueSendResult>
  sendBatch?: (messages: QueueBatchMessage[], options?: QueueSendBatchOptions) => Promise<void>

  readonly vercel: P extends 'vercel' ? VercelQueueNamespace : never
  readonly cloudflare: P extends 'cloudflare' ? CloudflareQueueNamespace : never
  readonly qstash: P extends 'qstash' ? QStashQueueNamespace : never
  readonly memory: P extends 'memory' ? MemoryQueueNamespace : never
  readonly netlify: P extends 'netlify' ? NetlifyQueueNamespace : never
}

export type VercelQueueClient = QueueClient<'vercel'>
export type CloudflareQueueClient = QueueClient<'cloudflare'>
export type QStashQueueClient = QueueClient<'qstash'>
export type MemoryQueueClient = QueueClient<'memory'>
export type NetlifyQueueClient = QueueClient<'netlify'>

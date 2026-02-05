import type { CloudflareQueueNamespace } from './cloudflare'
import type { QueueBatchMessage, QueueCapabilities, QueueProvider, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from './common'
import type { VercelQueueNamespace } from './vercel'

export type * from './cloudflare'
export type * from './common'
export type * from './vercel'

export interface QueueClient<P extends QueueProvider = QueueProvider> {
  readonly provider: P
  readonly supports: QueueCapabilities

  send: <T = unknown>(payload: T, options?: QueueSendOptions<T>) => Promise<QueueSendResult>
  sendBatch?: (messages: QueueBatchMessage[], options?: QueueSendBatchOptions) => Promise<void>

  readonly vercel: P extends 'vercel' ? VercelQueueNamespace : never
  readonly cloudflare: P extends 'cloudflare' ? CloudflareQueueNamespace : never
}

export type VercelQueueClient = QueueClient<'vercel'>
export type CloudflareQueueClient = QueueClient<'cloudflare'>

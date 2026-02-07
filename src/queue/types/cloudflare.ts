export type CloudflareQueueContentType = 'text' | 'bytes' | 'json' | 'v8'

export interface CloudflareQueueSendOptions {
  contentType?: CloudflareQueueContentType
  delaySeconds?: number
}

export interface CloudflareQueueBatchMessage<T = unknown> {
  body: T
  contentType?: CloudflareQueueContentType
}

export interface CloudflareQueueSendBatchOptions {
  delaySeconds?: number
}

export interface CloudflareQueueRetryOptions {
  delaySeconds?: number
}

export interface CloudflareQueueMessage<T = unknown> {
  id: string
  timestamp: Date
  body: T
  attempts: number
  ack: () => void
  retry: (options?: CloudflareQueueRetryOptions) => void
}

export interface CloudflareQueueMessageBatch<T = unknown> {
  queue: string
  messages: CloudflareQueueMessage<T>[]
  ackAll: () => void
  retryAll: (options?: CloudflareQueueRetryOptions) => void
}

export interface CloudflareQueueBindingLike {
  send: (body: unknown, options?: CloudflareQueueSendOptions) => Promise<void>
  sendBatch: (messages: CloudflareQueueBatchMessage[], options?: CloudflareQueueSendBatchOptions) => Promise<void>
}

export interface CloudflareQueueNamespace {
  readonly binding: CloudflareQueueBindingLike
}

export interface CloudflareQueueProviderOptions {
  name: 'cloudflare'
  binding: CloudflareQueueBindingLike
}

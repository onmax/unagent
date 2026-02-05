export type CloudflareQueueContentType = 'text' | 'bytes' | 'json' | 'v8'

export interface CloudflareQueueSendOptions {
  contentType?: CloudflareQueueContentType
}

export interface CloudflareQueueBatchMessage<T = unknown> {
  body: T
  contentType?: CloudflareQueueContentType
}

export interface CloudflareQueueSendBatchOptions {
  delaySeconds?: number
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

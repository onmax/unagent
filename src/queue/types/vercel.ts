export interface VercelQueueSendOptions {
  idempotencyKey?: string
  retentionSeconds?: number
  delaySeconds?: number
  transport?: unknown
  client?: unknown
}

export type VercelQueueMessageHandler<T = unknown> = (message: T, metadata: unknown) => unknown | Promise<unknown>

export interface VercelQueueReceiveOptions<T = unknown> {
  visibilityTimeoutSeconds?: number
  visibilityRefreshInterval?: number
  transport?: unknown
  client?: unknown
  maxConcurrency?: number
  limit?: number
  messageId?: string
  _payload?: T
}

export interface VercelQueueHandleCallbackOptions {
  client?: unknown
  visibilityTimeoutSeconds?: number
}

export interface VercelQueueParsedCallbackRequest {
  queueName: string
  consumerGroup: string
  messageId: string
}

export interface VercelQueueSDK {
  send: <T = unknown>(topicName: string, payload: T, options?: VercelQueueSendOptions) => Promise<{ messageId: string }>
  receive: <T = unknown>(topicName: string, consumerGroup: string, handler: VercelQueueMessageHandler<T>, options?: VercelQueueReceiveOptions<T>) => Promise<void>
  handleCallback: (handlers: Record<string, Record<string, VercelQueueMessageHandler>>, options?: VercelQueueHandleCallbackOptions) => (request: Request) => Promise<Response>
  parseCallback: (request: Request) => Promise<VercelQueueParsedCallbackRequest>
}

export interface VercelQueueNamespace {
  readonly topic: string
  readonly native: VercelQueueSDK
  readonly receive: <T = unknown>(consumerGroup: string, handler: VercelQueueMessageHandler<T>, options?: VercelQueueReceiveOptions<T>) => Promise<void>
  readonly handleCallback: (consumerGroupHandlers: Record<string, VercelQueueMessageHandler>, options?: VercelQueueHandleCallbackOptions) => (request: Request) => Promise<Response>
  readonly parseCallback: (request: Request) => Promise<VercelQueueParsedCallbackRequest>
}

export interface VercelQueueProviderOptions {
  name: 'vercel'
  topic: string
}

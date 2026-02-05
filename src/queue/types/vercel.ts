export interface VercelQueueSendOptions {
  idempotencyKey?: string
  retentionSeconds?: number
  delaySeconds?: number
  transport?: unknown
  client?: unknown
}

export interface VercelQueueSDK {
  send: <T = unknown>(topicName: string, payload: T, options?: VercelQueueSendOptions<T>) => Promise<{ messageId: string }>
}

export interface VercelQueueNamespace {
  readonly topic: string
  readonly native: VercelQueueSDK
}

export interface VercelQueueProviderOptions {
  name: 'vercel'
  topic: string
}

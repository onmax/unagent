export interface QStashQueueProviderOptions {
  name: 'qstash'
  token: string
  destination: string
  apiUrl?: string
}

export interface QStashQueueNamespace {
  readonly destination: string
  readonly apiUrl: string
  readonly native?: unknown
}

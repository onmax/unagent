export interface QStashCronProviderOptions {
  name: 'qstash'
  token: string
  apiUrl?: string
}

export interface QStashCronNamespace {
  readonly apiUrl: string
}

export interface CloudflareCronProviderOptions {
  name: 'cloudflare'
  accountId: string
  scriptName: string
  apiToken: string
  apiUrl?: string
}

export interface CloudflareCronNamespace {
  readonly accountId: string
  readonly scriptName: string
}

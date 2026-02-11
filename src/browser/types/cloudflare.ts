export interface CloudflareBrowserProviderOptions {
  name: 'cloudflare'
  binding: unknown
  launchOptions?: Record<string, unknown>
}

export interface CloudflareBrowserNamespace {
  readonly native: {
    binding: unknown
  }
}

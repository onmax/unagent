export interface BrowserbaseBrowserProviderOptions {
  name: 'browserbase'
  apiKey?: string
  projectId?: string
  session?: Record<string, unknown>
  clientOptions?: Record<string, unknown>
  connectOptions?: Record<string, unknown>
}

export interface BrowserbaseNamespace {
  readonly native: {
    client: unknown
  }
  activeSessionIds: () => string[]
}

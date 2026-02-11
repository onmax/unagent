export interface PlaywrightBrowserProviderOptions {
  name: 'playwright'
  launchOptions?: Record<string, unknown>
}

export interface PlaywrightBrowserNamespace {
  readonly native: {
    playwright?: unknown
  }
}

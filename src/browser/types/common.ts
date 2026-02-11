import type { BrowserbaseBrowserProviderOptions, BrowserbaseNamespace } from './browserbase'
import type { CloudflareBrowserNamespace, CloudflareBrowserProviderOptions } from './cloudflare'
import type { PlaywrightBrowserNamespace, PlaywrightBrowserProviderOptions } from './playwright'

export type BrowserProvider = 'playwright' | 'browserbase' | 'cloudflare'

export type BrowserProviderOptions = PlaywrightBrowserProviderOptions | BrowserbaseBrowserProviderOptions | CloudflareBrowserProviderOptions

export interface BrowserOptions {
  provider?: BrowserProviderOptions
}

export interface BrowserDetectionResult {
  type: 'cloudflare' | 'none'
  details?: Record<string, unknown>
}

export interface BrowserCapabilities {
  multiPage: boolean
  screenshot: boolean
  evaluate: boolean
  extractText: boolean
  extractHtml: boolean
  extractJson: boolean
}

export interface BrowserSessionOptions {
  contextOptions?: Record<string, unknown>
}

export interface BrowserPageOptions {
  url?: string
}

export interface BrowserGotoOptions {
  timeout?: number
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}

export interface BrowserClickOptions {
  timeout?: number
  button?: 'left' | 'right' | 'middle'
}

export interface BrowserTypeOptions {
  timeout?: number
  delay?: number
  clear?: boolean
}

export interface BrowserWaitForSelectorOptions {
  timeout?: number
  state?: 'attached' | 'detached' | 'visible' | 'hidden'
}

export interface BrowserScreenshotOptions {
  fullPage?: boolean
  type?: 'png' | 'jpeg'
  quality?: number
}

export type BrowserExtractOptions
  = | { kind: 'text', selector: string, all?: boolean, trim?: boolean }
    | { kind: 'html', selector?: string }
    | { kind: 'json', evaluate: () => unknown | Promise<unknown>, schema?: Record<string, unknown> }

export interface BrowserPage {
  goto: (url: string, options?: BrowserGotoOptions) => Promise<void>
  click: (selector: string, options?: BrowserClickOptions) => Promise<void>
  type: (selector: string, text: string, options?: BrowserTypeOptions) => Promise<void>
  press: (selector: string, key: string) => Promise<void>
  waitForSelector: (selector: string, options?: BrowserWaitForSelectorOptions) => Promise<void>
  url: () => Promise<string>
  content: () => Promise<string>
  screenshot: (options?: BrowserScreenshotOptions) => Promise<{ bytes: Uint8Array, mimeType: 'image/png' | 'image/jpeg' }>
  evaluate: <T>(fn: () => T | Promise<T>) => Promise<T>
  extract: (options: BrowserExtractOptions) => Promise<unknown>
  close: () => Promise<void>
}

export interface BrowserSession<P extends BrowserProvider = BrowserProvider> {
  readonly id: string
  readonly provider: P
  newPage: (options?: BrowserPageOptions) => Promise<BrowserPage>
  pages: () => Promise<BrowserPage[]>
  close: () => Promise<void>
}

export interface BrowserClient<P extends BrowserProvider = BrowserProvider> {
  readonly provider: P
  readonly supports: BrowserCapabilities
  newSession: (options?: BrowserSessionOptions) => Promise<BrowserSession<P>>
  close: () => Promise<void>
  readonly playwright: P extends 'playwright' ? PlaywrightBrowserNamespace : never
  readonly browserbase: P extends 'browserbase' ? BrowserbaseNamespace : never
  readonly cloudflare: P extends 'cloudflare' ? CloudflareBrowserNamespace : never
}

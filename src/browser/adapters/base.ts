import type { BrowserCapabilities, BrowserClickOptions, BrowserExtractOptions, BrowserGotoOptions, BrowserPage, BrowserPageOptions, BrowserProvider, BrowserScreenshotOptions, BrowserSession, BrowserSessionOptions, BrowserTypeOptions, BrowserWaitForSelectorOptions } from '../types'
import type { BrowserbaseNamespace } from '../types/browserbase'
import type { CloudflareBrowserNamespace } from '../types/cloudflare'
import type { PlaywrightBrowserNamespace } from '../types/playwright'
import Ajv from 'ajv'
import { BrowserError, NotSupportedError } from '../errors'

export interface PlaywrightLikePage {
  goto: (url: string, options?: Record<string, unknown>) => Promise<unknown>
  click: (selector: string, options?: Record<string, unknown>) => Promise<unknown>
  fill?: (selector: string, value: string, options?: Record<string, unknown>) => Promise<unknown>
  type?: (selector: string, value: string, options?: Record<string, unknown>) => Promise<unknown>
  press: (selector: string, key: string, options?: Record<string, unknown>) => Promise<unknown>
  waitForSelector: (selector: string, options?: Record<string, unknown>) => Promise<unknown>
  url: () => string
  content: () => Promise<string>
  screenshot: (options?: Record<string, unknown>) => Promise<unknown>
  evaluate: <T>(fn: (...args: any[]) => T | Promise<T>, ...args: any[]) => Promise<T>
  close: () => Promise<void>
}

interface PlaywrightLikeContext {
  newPage?: () => Promise<PlaywrightLikePage>
  pages?: () => PlaywrightLikePage[]
  close?: () => Promise<void>
}

interface PlaywrightLikeBrowser {
  newPage?: () => Promise<PlaywrightLikePage>
  newContext?: (options?: Record<string, unknown>) => Promise<PlaywrightLikeContext>
  contexts?: () => PlaywrightLikeContext[]
  close?: () => Promise<void>
}

const DEFAULT_CAPABILITIES: BrowserCapabilities = {
  multiPage: true,
  screenshot: true,
  evaluate: true,
  extractText: true,
  extractHtml: true,
  extractJson: true,
}

class WrappedPlaywrightPage implements BrowserPage {
  private page: PlaywrightLikePage
  private ajv: Ajv

  constructor(page: PlaywrightLikePage, ajv: Ajv) {
    this.page = page
    this.ajv = ajv
  }

  async goto(url: string, options?: BrowserGotoOptions): Promise<void> {
    const gotoOptions: Record<string, unknown> = {}
    if (typeof options?.timeout === 'number')
      gotoOptions.timeout = options.timeout
    if (options?.waitUntil)
      gotoOptions.waitUntil = options.waitUntil
    await this.page.goto(url, gotoOptions)
  }

  async click(selector: string, options?: BrowserClickOptions): Promise<void> {
    const clickOptions: Record<string, unknown> = {}
    if (typeof options?.timeout === 'number')
      clickOptions.timeout = options.timeout
    if (options?.button)
      clickOptions.button = options.button
    await this.page.click(selector, clickOptions)
  }

  async type(selector: string, text: string, options?: BrowserTypeOptions): Promise<void> {
    const typeOptions: Record<string, unknown> = {}
    if (typeof options?.timeout === 'number')
      typeOptions.timeout = options.timeout
    if (typeof options?.delay === 'number')
      typeOptions.delay = options.delay

    if (options?.clear && this.page.fill)
      await this.page.fill(selector, '', typeOptions)

    if (this.page.type) {
      await this.page.type(selector, text, typeOptions)
      return
    }

    if (!this.page.fill)
      throw new BrowserError('Page typing is not supported by this provider page instance', 'NOT_SUPPORTED')
    await this.page.fill(selector, text, typeOptions)
  }

  async press(selector: string, key: string): Promise<void> {
    await this.page.press(selector, key)
  }

  async waitForSelector(selector: string, options?: BrowserWaitForSelectorOptions): Promise<void> {
    const waitOptions: Record<string, unknown> = {}
    if (typeof options?.timeout === 'number')
      waitOptions.timeout = options.timeout
    if (options?.state)
      waitOptions.state = options.state
    await this.page.waitForSelector(selector, waitOptions)
  }

  async url(): Promise<string> {
    return this.page.url()
  }

  async content(): Promise<string> {
    return this.page.content()
  }

  async screenshot(options?: BrowserScreenshotOptions): Promise<{ bytes: Uint8Array, mimeType: 'image/png' | 'image/jpeg' }> {
    const type = options?.type || 'png'
    const raw = await this.page.screenshot({
      type,
      fullPage: options?.fullPage,
      quality: options?.quality,
    })
    const bytes = normalizeBytes(raw)
    return {
      bytes,
      mimeType: type === 'jpeg' ? 'image/jpeg' : 'image/png',
    }
  }

  async evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.page.evaluate(fn as unknown as (...args: any[]) => T | Promise<T>)
  }

  async extract(options: BrowserExtractOptions): Promise<unknown> {
    if (options.kind === 'text') {
      return this.page.evaluate((input: { selector: string, all: boolean, trim: boolean }) => {
        const doc = (globalThis as any).document as any
        if (!doc)
          return input.all ? [] : ''

        if (input.all) {
          return Array.from(doc.querySelectorAll(input.selector)).map((el: any) => {
            const value = String(el?.textContent ?? '')
            return input.trim ? value.trim() : value
          })
        }

        const el = doc.querySelector(input.selector)
        const value = String(el?.textContent ?? '')
        return input.trim ? value.trim() : value
      }, {
        selector: options.selector,
        all: !!options.all,
        trim: options.trim !== false,
      })
    }

    if (options.kind === 'html') {
      if (!options.selector)
        return this.content()

      return this.page.evaluate((input: { selector: string }) => {
        const doc = (globalThis as any).document as any
        const el = doc?.querySelector?.(input.selector)
        return String(el?.outerHTML ?? '')
      }, { selector: options.selector })
    }

    const value = await this.evaluate(options.evaluate)

    if (options.schema) {
      const valid = this.ajv.validate(options.schema, value)
      if (!valid) {
        throw new BrowserError('JSON extraction failed schema validation', 'SCHEMA_VALIDATION_FAILED', {
          errors: this.ajv.errors || [],
        })
      }
    }

    return value
  }

  async close(): Promise<void> {
    await this.page.close()
  }
}

export interface PlaywrightSessionParams<P extends BrowserProvider> {
  id: string
  provider: P
  browser: PlaywrightLikeBrowser
  context?: PlaywrightLikeContext
  ajv: Ajv
  onClose?: () => void
  onFinalize?: () => Promise<void> | void
}

export class PlaywrightBackedSession<P extends BrowserProvider> implements BrowserSession<P> {
  readonly id: string
  readonly provider: P

  private browser: PlaywrightLikeBrowser
  private context?: PlaywrightLikeContext
  private ajv: Ajv
  private onClose?: () => void
  private onFinalize?: () => Promise<void> | void
  private closed = false
  private pagesByNative = new Map<PlaywrightLikePage, BrowserPage>()

  constructor(params: PlaywrightSessionParams<P>) {
    this.id = params.id
    this.provider = params.provider
    this.browser = params.browser
    this.context = params.context
    this.ajv = params.ajv
    this.onClose = params.onClose
    this.onFinalize = params.onFinalize
  }

  async newPage(options?: BrowserPageOptions): Promise<BrowserPage> {
    if (this.closed)
      throw new BrowserError(`Browser session ${this.id} is already closed`, 'SESSION_CLOSED')

    let page: PlaywrightLikePage | undefined

    if (this.context?.newPage)
      page = await this.context.newPage()
    else if (this.browser.newPage)
      page = await this.browser.newPage()

    if (!page)
      throw new BrowserError('Provider browser instance cannot create new pages', 'NOT_SUPPORTED')

    const wrapped = this.getOrCreateWrappedPage(page)
    if (options?.url)
      await wrapped.goto(options.url)
    return wrapped
  }

  async pages(): Promise<BrowserPage[]> {
    const natives = this.context?.pages?.() || []
    if (!natives.length)
      return Array.from(this.pagesByNative.values())

    return natives.map(page => this.getOrCreateWrappedPage(page))
  }

  async close(): Promise<void> {
    if (this.closed)
      return

    let firstError: unknown

    try {
      if (this.context?.close)
        await this.context.close()
      else if (this.browser.close)
        await this.browser.close()
    }
    catch (error) {
      firstError ||= error
    }

    try {
      if (this.onFinalize)
        await this.onFinalize()
    }
    catch (error) {
      firstError ||= error
    }

    this.closed = true
    this.pagesByNative.clear()
    this.onClose?.()

    if (firstError)
      throw firstError
  }

  private getOrCreateWrappedPage(page: PlaywrightLikePage): BrowserPage {
    const existing = this.pagesByNative.get(page)
    if (existing)
      return existing

    const wrapped = new WrappedPlaywrightPage(page, this.ajv)
    this.pagesByNative.set(page, wrapped)
    return wrapped
  }
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeBytes(input: unknown): Uint8Array {
  if (input instanceof Uint8Array)
    return input

  if (input instanceof ArrayBuffer)
    return new Uint8Array(input)

  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }

  if (input && typeof input === 'object' && 'buffer' in input && ArrayBuffer.isView(input as any)) {
    const view = input as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }

  throw new BrowserError('Screenshot response is not a binary buffer', 'INVALID_RESPONSE')
}

export abstract class BaseBrowserAdapter<P extends BrowserProvider> {
  abstract readonly provider: P
  readonly supports: BrowserCapabilities = DEFAULT_CAPABILITIES

  private readonly ajv = new Ajv({ allErrors: true, strict: false })
  private readonly sessions = new Set<BrowserSession<P>>()

  protected get validator(): Ajv {
    return this.ajv
  }

  protected addSession<T extends BrowserSession<P>>(session: T): T {
    this.sessions.add(session)
    return session
  }

  protected removeSession(session: BrowserSession<P>): void {
    this.sessions.delete(session)
  }

  protected abstract closeProvider(): Promise<void>

  async close(): Promise<void> {
    const active = Array.from(this.sessions)
    this.sessions.clear()
    await Promise.allSettled(active.map(session => session.close()))
    await this.closeProvider()
  }

  get playwright(): P extends 'playwright' ? PlaywrightBrowserNamespace : never {
    throw new NotSupportedError('playwright namespace', this.provider)
  }

  get browserbase(): P extends 'browserbase' ? BrowserbaseNamespace : never {
    throw new NotSupportedError('browserbase namespace', this.provider)
  }

  get cloudflare(): P extends 'cloudflare' ? CloudflareBrowserNamespace : never {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }

  protected createPlaywrightSession(params: Omit<PlaywrightSessionParams<P>, 'ajv'>): PlaywrightBackedSession<P> {
    return new PlaywrightBackedSession<P>({ ...params, ajv: this.ajv })
  }

  abstract newSession(options?: BrowserSessionOptions): Promise<BrowserSession<P>>
}

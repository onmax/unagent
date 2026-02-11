import type { BrowserSession, BrowserSessionOptions } from '../types/common'
import type { PlaywrightBrowserNamespace, PlaywrightBrowserProviderOptions } from '../types/playwright'
import { dynamicImport } from '../_import'
import { BrowserError } from '../errors'
import { BaseBrowserAdapter, createId } from './base'

export class PlaywrightBrowserAdapter extends BaseBrowserAdapter<'playwright'> {
  override readonly provider = 'playwright' as const

  private options: PlaywrightBrowserProviderOptions
  private namespace: PlaywrightBrowserNamespace = {
    native: {},
  }

  constructor(options: PlaywrightBrowserProviderOptions) {
    super()
    this.options = options
  }

  override get playwright(): PlaywrightBrowserNamespace {
    return this.namespace
  }

  override async newSession(options?: BrowserSessionOptions): Promise<BrowserSession<'playwright'>> {
    let mod: any

    try {
      mod = await dynamicImport('playwright')
    }
    catch (error) {
      throw new BrowserError(`playwright load failed. Install it to use the Playwright provider. Original error: ${error instanceof Error ? error.message : error}`)
    }

    const chromium = mod?.chromium
    if (!chromium?.launch) {
      throw new BrowserError('playwright chromium launcher is not available', 'INVALID_RESPONSE')
    }

    const browser = await chromium.launch(this.options.launchOptions || {})
    this.namespace.native.playwright = mod

    let context: any
    if (typeof browser.newContext === 'function') {
      context = await browser.newContext(options?.contextOptions || {})
    }

    const session = this.createPlaywrightSession({
      id: createId('playwright'),
      provider: 'playwright',
      browser,
      context,
      onClose: () => this.removeSession(session),
    })

    return this.addSession(session)
  }

  protected override async closeProvider(): Promise<void> {
    // No global resources to clean up.
  }
}

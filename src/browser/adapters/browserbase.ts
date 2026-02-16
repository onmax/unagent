import type { BrowserbaseBrowserProviderOptions, BrowserbaseNamespace } from '../types/browserbase'
import type { BrowserSession, BrowserSessionOptions } from '../types/common'
import { dynamicImport } from '../../_internal/dynamic-import'
import { BrowserError } from '../errors'
import { BaseBrowserAdapter } from './base'

export class BrowserbaseBrowserAdapter extends BaseBrowserAdapter<'browserbase'> {
  override readonly provider = 'browserbase' as const

  private options: BrowserbaseBrowserProviderOptions
  private client: any
  private readonly activeIds = new Set<string>()

  constructor(options: BrowserbaseBrowserProviderOptions) {
    super()
    this.options = options
  }

  override get browserbase(): BrowserbaseNamespace {
    return {
      native: {
        client: this.client || null,
      },
      activeSessionIds: () => Array.from(this.activeIds),
    }
  }

  override async newSession(options?: BrowserSessionOptions): Promise<BrowserSession<'browserbase'>> {
    const projectId = this.options.projectId || process.env.BROWSERBASE_PROJECT_ID
    if (!projectId)
      throw new BrowserError('[browserbase] projectId is required (set provider.projectId or BROWSERBASE_PROJECT_ID)', 'INVALID_OPTIONS')

    const client = await this.getClient()
    const createPayload = {
      projectId,
      ...(this.options.session || {}),
    }

    const sessionResponse = await client.sessions.create(createPayload)
    const sessionId = sessionResponse?.id
    const connectUrl = sessionResponse?.connectUrl

    if (!sessionId)
      throw new BrowserError('[browserbase] session response is missing id', 'INVALID_RESPONSE')
    if (!connectUrl)
      throw new BrowserError('[browserbase] session response is missing connectUrl', 'INVALID_RESPONSE')

    let browser: any

    try {
      let playwright: any
      try {
        playwright = await dynamicImport('playwright')
      }
      catch (error) {
        throw new BrowserError(`playwright load failed. Install it to use the Browserbase provider. Original error: ${error instanceof Error ? error.message : error}`)
      }

      const chromium = playwright?.chromium
      if (!chromium?.connectOverCDP)
        throw new BrowserError('[browserbase] playwright chromium.connectOverCDP is not available', 'INVALID_RESPONSE')

      browser = await chromium.connectOverCDP(connectUrl, this.options.connectOptions || {})
      const context = browser?.contexts?.()[0] || (typeof browser?.newContext === 'function' ? await browser.newContext(options?.contextOptions || {}) : undefined)

      this.activeIds.add(sessionId)

      const session = this.createPlaywrightSession({
        id: sessionId,
        provider: 'browserbase',
        browser,
        context,
        onClose: () => {
          this.activeIds.delete(sessionId)
          this.removeSession(session)
        },
        onFinalize: async () => {
          await client.sessions.update(sessionId, {
            projectId,
            status: 'REQUEST_RELEASE',
          })
        },
      })

      return this.addSession(session)
    }
    catch (error) {
      try {
        if (browser?.close)
          await browser.close()
      }
      catch {}

      try {
        await client.sessions.update(sessionId, {
          projectId,
          status: 'REQUEST_RELEASE',
        })
      }
      catch {}

      throw error
    }
  }

  protected override async closeProvider(): Promise<void> {
    this.activeIds.clear()
  }

  private async getClient(): Promise<any> {
    if (this.client)
      return this.client

    const apiKey = this.options.apiKey || process.env.BROWSERBASE_API_KEY
    if (!apiKey)
      throw new BrowserError('[browserbase] apiKey is required (set provider.apiKey or BROWSERBASE_API_KEY)', 'INVALID_OPTIONS')

    let Browserbase: any
    try {
      const mod: any = await dynamicImport('@browserbasehq/sdk')
      Browserbase = mod?.default || mod
    }
    catch (error) {
      throw new BrowserError(`@browserbasehq/sdk load failed. Install it to use the Browserbase provider. Original error: ${error instanceof Error ? error.message : error}`)
    }

    if (!Browserbase)
      throw new BrowserError('[browserbase] Browserbase SDK constructor is not available', 'INVALID_RESPONSE')

    this.client = new Browserbase({
      apiKey,
      ...(this.options.clientOptions || {}),
    })

    return this.client
  }
}

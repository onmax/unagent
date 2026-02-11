import type { CloudflareBrowserNamespace, CloudflareBrowserProviderOptions } from '../types/cloudflare'
import type { BrowserSession, BrowserSessionOptions } from '../types/common'
import { BrowserError } from '../errors'
import { BaseBrowserAdapter, createId } from './base'

export class CloudflareBrowserAdapter extends BaseBrowserAdapter<'cloudflare'> {
  override readonly provider = 'cloudflare' as const

  private options: CloudflareBrowserProviderOptions

  constructor(options: CloudflareBrowserProviderOptions) {
    super()
    this.options = options
  }

  override get cloudflare(): CloudflareBrowserNamespace {
    return {
      native: {
        binding: this.options.binding,
      },
    }
  }

  override async newSession(options?: BrowserSessionOptions): Promise<BrowserSession<'cloudflare'>> {
    if (!this.options.binding)
      throw new BrowserError('[cloudflare] binding is required', 'INVALID_OPTIONS')

    let launch: ((binding: unknown, opts?: Record<string, unknown>) => Promise<any>) | undefined
    let endpointURLString: ((binding: unknown, opts?: { sessionId?: string, persistent?: boolean, keepAlive?: number }) => string) | undefined

    try {
      const mod: any = await import('@cloudflare/playwright')
      launch = mod?.launch
      endpointURLString = mod?.endpointURLString
    }
    catch (error) {
      throw new BrowserError(`@cloudflare/playwright load failed. Install it to use the Cloudflare provider. Original error: ${error instanceof Error ? error.message : error}`)
    }

    if (typeof launch !== 'function')
      throw new BrowserError('@cloudflare/playwright launch() is not available', 'INVALID_RESPONSE')

    let endpoint: unknown = this.options.binding
    if (typeof endpoint === 'string' && !endpoint.includes('://') && typeof endpointURLString === 'function')
      endpoint = endpointURLString(endpoint)

    const browser = await launch(endpoint, this.options.launchOptions || {})
    let context: any
    if (typeof browser?.newContext === 'function') {
      context = await browser.newContext(options?.contextOptions || {})
    }

    const session = this.createPlaywrightSession({
      id: createId('cloudflare'),
      provider: 'cloudflare',
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

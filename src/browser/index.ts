import type {
  BrowserClient,
  BrowserDetectionResult,
  BrowserOptions,
  BrowserProvider,
  BrowserProviderOptions,
} from './types'
import type { BrowserbaseBrowserProviderOptions } from './types/browserbase'
import type { CloudflareBrowserProviderOptions } from './types/cloudflare'
import type { PlaywrightBrowserProviderOptions } from './types/playwright'
import { provider as envProvider, isWorkerd } from 'std-env'
import { BrowserbaseBrowserAdapter, CloudflareBrowserAdapter, PlaywrightBrowserAdapter } from './adapters'
import { BrowserError } from './errors'

export { BrowserError, NotSupportedError } from './errors'
export type * from './types'

export function detectBrowser(): BrowserDetectionResult {
  if (isWorkerd || envProvider === 'cloudflare_workers')
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (envProvider === 'cloudflare_pages')
    return { type: 'cloudflare', details: { runtime: 'pages' } }

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>

  if (env.CLOUDFLARE_WORKER)
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'pages' } }

  return { type: 'none' }
}

function canResolve(moduleName: string): boolean {
  try {
    const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
    if (!resolver)
      throw new Error('no-require-resolve')
    resolver(moduleName)
    return true
  }
  catch {
    try {
      const resolver = (import.meta as { resolve?: (id: string) => string }).resolve
      if (typeof resolver !== 'function')
        return false
      resolver(moduleName)
      return true
    }
    catch {
      return false
    }
  }
}

export function isBrowserAvailable(provider: BrowserProvider): boolean {
  if (provider === 'cloudflare') {
    if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
      return true

    if (typeof process !== 'undefined') {
      if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
        return true
    }

    return canResolve('@cloudflare/playwright')
  }

  if (provider === 'playwright')
    return canResolve('playwright')

  if (provider === 'browserbase')
    return canResolve('@browserbasehq/sdk') && canResolve('playwright')

  return false
}

function resolveProvider(provider: BrowserProviderOptions | undefined): BrowserProviderOptions {
  if (provider)
    return provider

  if (detectBrowser().type === 'cloudflare') {
    throw new BrowserError('Cloudflare browser binding is required. Pass { provider: { name: "cloudflare", binding } }.', 'INVALID_OPTIONS')
  }

  throw new BrowserError('Browser provider is required. Pass { provider }.', 'INVALID_OPTIONS')
}

export function createBrowser(options: { provider: PlaywrightBrowserProviderOptions }): Promise<BrowserClient<'playwright'>>
export function createBrowser(options: { provider: BrowserbaseBrowserProviderOptions }): Promise<BrowserClient<'browserbase'>>
export function createBrowser(options: { provider: CloudflareBrowserProviderOptions }): Promise<BrowserClient<'cloudflare'>>
export function createBrowser(options: BrowserOptions): Promise<BrowserClient>
export async function createBrowser(options: BrowserOptions = {}): Promise<BrowserClient> {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'playwright') {
    return new PlaywrightBrowserAdapter(resolved)
  }

  if (resolved.name === 'browserbase') {
    const projectId = resolved.projectId || process.env.BROWSERBASE_PROJECT_ID
    const apiKey = resolved.apiKey || process.env.BROWSERBASE_API_KEY

    if (!projectId) {
      throw new BrowserError('[browserbase] projectId is required (set provider.projectId or BROWSERBASE_PROJECT_ID)', 'INVALID_OPTIONS')
    }
    if (!apiKey) {
      throw new BrowserError('[browserbase] apiKey is required (set provider.apiKey or BROWSERBASE_API_KEY)', 'INVALID_OPTIONS')
    }

    return new BrowserbaseBrowserAdapter(resolved)
  }

  if (resolved.name === 'cloudflare') {
    if (!resolved.binding)
      throw new BrowserError('[cloudflare] binding is required (pass provider.binding)', 'INVALID_OPTIONS')

    return new CloudflareBrowserAdapter(resolved)
  }

  throw new BrowserError(`Unknown browser provider: ${(resolved as { name: string }).name}`)
}

import { defineEventHandler } from 'h3'
import { getProvider } from '../../server/_shared/provider'

export default defineEventHandler((event) => {
  const sym = Symbol.for('@vercel/request-context')
  const g = globalThis as unknown as Record<symbol, unknown>
  const ctx = (g[sym] as { get?: (() => any) } | undefined)?.get?.()
  const headers = (ctx && typeof ctx === 'object') ? (ctx as any).headers : undefined

  return {
    provider: getProvider(event),
    hasRequestContextSymbol: typeof (g[sym] as any)?.get === 'function',
    hasOidcTokenInContext: !!(headers && typeof headers === 'object' && headers['x-vercel-oidc-token']),
  }
})

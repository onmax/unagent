import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const sym = Symbol.for('@vercel/request-context')
  const g = globalThis as unknown as Record<symbol, unknown>
  const ctx = (g[sym] as { get?: (() => any) } | undefined)?.get?.()
  const headers = (ctx && typeof ctx === 'object') ? (ctx as any).headers : undefined

  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV)

  return {
    provider: isVercel ? 'vercel' : 'node',
    hasRequestContextSymbol: typeof (g[sym] as any)?.get === 'function',
    hasOidcTokenInContext: !!(headers && typeof headers === 'object' && headers['x-vercel-oidc-token']),
  }
})


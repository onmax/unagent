import { getRequestHeaders } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'
import { ensureVercelRequestContext } from 'unagent/vercel'

export default defineNitroPlugin(async (nitroApp) => {
  if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
    return
  }

  const sym = Symbol.for('@vercel/request-context')
  const g = globalThis as unknown as Record<symbol, unknown>
  const existing = g[sym] as { get?: unknown } | undefined
  if (existing && typeof existing.get === 'function') {
    return
  }

  const { AsyncLocalStorage } = await import('node:async_hooks')
  const als = new AsyncLocalStorage<{ headers: Record<string, string> }>()

  ensureVercelRequestContext(() => als.getStore() ?? { headers: {} })

  nitroApp.hooks.hook('request', (event) => {
    const raw = getRequestHeaders(event)
    const headers: Record<string, string> = {}

    for (const [key, value] of Object.entries(raw)) {
      if (value === undefined) {
        continue
      }
      headers[key.toLowerCase()] = Array.isArray(value) ? value.join(',') : String(value)
    }

    als.enterWith({ headers })
  })
})

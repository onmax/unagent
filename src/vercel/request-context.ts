export interface VercelRequestContext {
  headers?: Record<string, string>
}

export function ensureVercelRequestContext(get: () => VercelRequestContext): void {
  const sym = Symbol.for('@vercel/request-context')
  const g = globalThis as unknown as Record<symbol, unknown>
  const existing = g[sym] as { get?: unknown } | undefined

  if (existing && typeof existing.get === 'function') {
    return
  }

  g[sym] = { get }
}

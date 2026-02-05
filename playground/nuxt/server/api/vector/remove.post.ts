import type { VectorProviderName } from 'unagent/vector'
import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getVector } from 'unagent/vector/nitro'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { provider?: VectorProviderName, ids?: string[] }
  const ids = body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Missing ids array.' })
  }

  const runtimeConfig = useRuntimeConfig()
  const contextKey = (runtimeConfig as any).vector?.contextKey || 'vector'
  const vector = await getVector(event as any, body?.provider, contextKey)
  if (!vector.supports.remove)
    return { ok: false, error: 'remove not supported by provider' }

  const result = await vector.remove?.(ids)
  return { ok: true, result }
})

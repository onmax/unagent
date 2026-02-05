import type { VectorProviderName } from 'unagent/vector'
import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getVector } from 'unagent/vector/nitro'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { provider?: VectorProviderName }
  const runtimeConfig = useRuntimeConfig()
  const contextKey = (runtimeConfig as any).vector?.contextKey || 'vector'
  const vector = await getVector(event as any, body?.provider, contextKey)
  if (!vector.supports.clear)
    return { ok: false, error: 'clear not supported by provider' }

  await vector.clear?.()
  return { ok: true }
})

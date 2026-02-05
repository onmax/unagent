import type { VectorDocument, VectorProviderName } from 'unagent/vector'
import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, readBody } from 'h3'
import { getVector } from 'unagent/vector/nitro'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { provider?: VectorProviderName, docs?: VectorDocument[] }
  const docs = body?.docs
  if (!Array.isArray(docs)) {
    throw createError({ statusCode: 400, message: 'Missing docs array.' })
  }

  const runtimeConfig = useRuntimeConfig()
  const contextKey = (runtimeConfig as any).vector?.contextKey || 'vector'
  const vector = await getVector(event as any, body?.provider, contextKey)
  const result = await vector.index(docs)

  return { ok: true, result }
})

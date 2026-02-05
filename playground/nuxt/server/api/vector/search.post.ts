import type { VectorProviderName, VectorSearchOptions } from 'unagent/vector'
import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getVector } from 'unagent/vector/nitro'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { provider?: VectorProviderName, query?: string, options?: VectorSearchOptions }
  if (!body?.query) {
    throw createError({ statusCode: 400, message: 'Missing query.' })
  }

  const runtimeConfig = useRuntimeConfig()
  const contextKey = (runtimeConfig as any).vector?.contextKey || 'vector'
  const vector = await getVector(event as any, body?.provider, contextKey)
  const results = await vector.search(body.query, body.options)

  return { ok: true, results }
})

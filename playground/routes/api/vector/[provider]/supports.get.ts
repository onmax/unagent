import type { VectorProvider } from '../../../../server/_shared/vector'
import { defineEventHandler, getQuery } from 'h3'
import { jsonError, nowIso } from '../../../../server/_shared/http'
import { createPlaygroundVector } from '../../../../server/_shared/vector'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as VectorProvider
  const embeddings = (getQuery(event).embeddings as string) || undefined
  const start = Date.now()
  try {
    const { vector } = await createPlaygroundVector(event, provider, { embeddings })
    return {
      provider,
      supports: vector.supports,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 400, error instanceof Error ? error.message : String(error), { elapsed: Date.now() - start })
  }
})

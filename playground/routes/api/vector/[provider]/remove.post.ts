import type { VectorProvider } from '../../../../server/_shared/vector'
import { defineEventHandler, getQuery } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundVector } from '../../../../server/_shared/vector'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as VectorProvider
  const embeddings = (getQuery(event).embeddings as string) || undefined
  const start = Date.now()
  try {
    const body = await readJsonBody(event)
    const ids = Array.isArray((body as any)?.ids) ? (body as any).ids : Array.isArray(body) ? body : []

    if (!ids.length)
      return jsonError(event, 400, 'Missing ids', { elapsed: Date.now() - start })

    const { vector } = await createPlaygroundVector(event, provider, { embeddings })
    if (!vector.remove)
      return jsonError(event, 400, 'remove() is not supported', { elapsed: Date.now() - start })

    const result = await vector.remove(ids)
    return {
      provider,
      count: result.count,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 400, error instanceof Error ? error.message : String(error), { elapsed: Date.now() - start })
  }
})

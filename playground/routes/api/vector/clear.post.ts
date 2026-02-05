import { defineEventHandler } from 'h3'
import { jsonError, nowIso } from '../../../server/_shared/http'
import { getCloudflareVector } from '../../../server/_shared/vector'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  try {
    const vector = getCloudflareVector(event)
    if (!vector.clear)
      return jsonError(event, 400, 'clear() is not supported', { elapsed: Date.now() - start })

    await vector.clear()
    return {
      provider: 'cloudflare',
      cleared: true,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 400, error instanceof Error ? error.message : String(error), { elapsed: Date.now() - start })
  }
})

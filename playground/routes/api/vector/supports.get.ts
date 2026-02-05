import { defineEventHandler } from 'h3'
import { jsonError, nowIso } from '../../../server/_shared/http'
import { getCloudflareVector } from '../../../server/_shared/vector'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  try {
    const vector = getCloudflareVector(event)
    return {
      provider: 'cloudflare',
      supports: vector.supports,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 400, error instanceof Error ? error.message : String(error), { elapsed: Date.now() - start })
  }
})

import type { VectorSearchOptions } from '../../../server/_shared/vector'
import { defineEventHandler } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../server/_shared/http'
import { getCloudflareVector } from '../../../server/_shared/vector'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  try {
    const body = await readJsonBody(event)
    const query = typeof (body as any)?.query === 'string'
      ? (body as any).query
      : typeof (body as any)?.q === 'string'
        ? (body as any).q
        : 'hello world'

    let options: VectorSearchOptions = {}
    if ((body as any)?.options && typeof (body as any).options === 'object') {
      options = (body as any).options
    }
    else if (body && typeof body === 'object') {
      const { query: _query, q: _q, docs: _docs, ids: _ids, ...rest } = body as any
      options = rest
    }

    const vector = getCloudflareVector(event)
    const results = await vector.search(query, options)

    return {
      provider: 'cloudflare',
      query,
      results,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 400, error instanceof Error ? error.message : String(error), { elapsed: Date.now() - start })
  }
})

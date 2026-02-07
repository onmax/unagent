import { defineEventHandler, getQuery } from 'h3'
import { jsonError, nowIso } from '../../../server/_shared/http'
import { createPlaygroundQueue } from '../../../server/_shared/queue'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, queue } = await createPlaygroundQueue(event)
  if (queue?.provider !== 'memory')
    return jsonError(event, 400, 'peek() is only available for the memory queue provider', { provider, queueProvider: queue?.provider, elapsed: Date.now() - start })

  const query = getQuery(event)
  const limitRaw = Array.isArray((query as any)?.limit) ? (query as any).limit[0] : (query as any)?.limit
  const limit = Math.max(1, Math.min(200, Number.parseInt(String(limitRaw ?? '20'), 10) || 20))
  const items = queue.memory.peek(limit)

  return {
    provider,
    queueProvider: queue.provider,
    size: queue.memory.size(),
    items,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

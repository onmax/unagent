import type { QueueProvider } from '../../../../server/_shared/queue'
import { defineEventHandler } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundQueue } from '../../../../server/_shared/queue'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as QueueProvider
  const start = Date.now()
  const { queue } = await createPlaygroundQueue(event, provider)
  if (queue?.provider !== 'memory')
    return jsonError(event, 400, 'drain() is only available for the memory queue provider', { provider, queueProvider: queue?.provider, elapsed: Date.now() - start })

  const body = await readJsonBody(event)
  const limit = Math.max(0, Math.min(200, Number((body as any)?.limit ?? 50) || 50))

  const drained: { messageId: string, enqueuedAt: string, payload: unknown }[] = []
  const count = await queue.memory.drain(async (payload: unknown, meta: { messageId: string, enqueuedAt: Date }) => {
    if (drained.length < limit) {
      drained.push({ messageId: meta.messageId, enqueuedAt: meta.enqueuedAt.toISOString(), payload })
    }
  })

  return {
    provider,
    queueProvider: queue.provider,
    count,
    drained,
    remaining: queue.memory.size(),
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

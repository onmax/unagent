import { defineEventHandler } from 'h3'
import { nowIso } from '../../../server/_shared/http'
import { createPlaygroundQueue, VERCEL_QUEUE_TOPIC } from '../../../server/_shared/queue'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, queue } = await createPlaygroundQueue(event)
  return {
    provider,
    queueProvider: queue.provider,
    ...(provider === 'vercel' ? { topic: VERCEL_QUEUE_TOPIC } : {}),
    supports: queue.supports,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

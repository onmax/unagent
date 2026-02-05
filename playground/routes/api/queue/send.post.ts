import { defineEventHandler } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../server/_shared/http'
import { createPlaygroundQueue, VERCEL_QUEUE_TOPIC } from '../../../server/_shared/queue'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const body = await readJsonBody(event)

  if (!Object.prototype.hasOwnProperty.call(body, 'payload'))
    return jsonError(event, 400, 'Missing payload', { elapsed: Date.now() - start })

  const { payload, options } = body as any
  const { provider, queue } = await createPlaygroundQueue(event)
  const result = await queue.send(payload, options)

  return {
    provider,
    ...(provider === 'vercel' ? { topic: VERCEL_QUEUE_TOPIC } : {}),
    ...result,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

import type { QueueProvider } from '../../../../server/_shared/queue'
import { defineEventHandler } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundQueue, VERCEL_QUEUE_TOPIC } from '../../../../server/_shared/queue'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as QueueProvider
  const start = Date.now()
  const body = await readJsonBody(event)

  if (!Object.prototype.hasOwnProperty.call(body, 'payload'))
    return jsonError(event, 400, 'Missing payload', { elapsed: Date.now() - start })

  const { payload, options, destination } = body as any
  const { queue } = await createPlaygroundQueue(event, provider, { destination })
  const result = await queue.send(payload, options)

  return {
    provider,
    queueProvider: queue.provider,
    ...(provider === 'vercel' ? { topic: VERCEL_QUEUE_TOPIC } : {}),
    ...result,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

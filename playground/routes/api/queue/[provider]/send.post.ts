import type { QueueProvider } from '../../../../server/_shared/queue'
import { defineEventHandler } from 'h3'
import { QueueError } from 'unagent/queue'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundQueue, VERCEL_QUEUE_TOPIC } from '../../../../server/_shared/queue'

function resolveStatus(error: QueueError): number {
  if (typeof error.httpStatus === 'number')
    return error.httpStatus
  if (error.code === 'QSTASH_CONFIG_INVALID')
    return 400
  if (error.code === 'QSTASH_AUTH_FAILED')
    return 401
  return 500
}

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as QueueProvider
  const start = Date.now()
  const body = await readJsonBody(event)

  if (!Object.prototype.hasOwnProperty.call(body, 'payload'))
    return jsonError(event, 400, 'Missing payload', { elapsed: Date.now() - start })

  const { payload, options, destination } = body as any
  try {
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
  }
  catch (error) {
    if (error instanceof QueueError) {
      return jsonError(event, resolveStatus(error), error.message, {
        provider,
        code: error.code,
        queueProvider: error.provider,
        upstreamError: error.upstreamError,
        details: error.details,
        elapsed: Date.now() - start,
      })
    }
    return jsonError(event, 500, error instanceof Error ? error.message : String(error), {
      provider,
      elapsed: Date.now() - start,
    })
  }
})

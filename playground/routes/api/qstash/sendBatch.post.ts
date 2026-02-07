import { defineEventHandler } from 'h3'
import { createQueue } from 'unagent/queue'
import { jsonError, nowIso, readJsonBody } from '../../../server/_shared/http'
import { getProvider } from '../../../server/_shared/provider'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const token = process.env.QSTASH_TOKEN
  const apiUrl = process.env.QSTASH_API_URL
  const defaultDestination = process.env.QSTASH_DESTINATION

  if (!token)
    return jsonError(event, 400, 'Missing QSTASH_TOKEN', { provider: getProvider(event), elapsed: Date.now() - start })

  const body = await readJsonBody(event)
  const destination = typeof (body as any)?.destination === 'string'
    ? (body as any).destination
    : defaultDestination

  if (!destination)
    return jsonError(event, 400, 'Missing destination (pass { destination } or set QSTASH_DESTINATION)', { provider: getProvider(event), elapsed: Date.now() - start })

  const messages = Array.isArray((body as any)?.messages) ? (body as any).messages : []
  const options = ((body as any)?.options && typeof (body as any).options === 'object') ? (body as any).options : {}

  if (!messages.length)
    return jsonError(event, 400, 'Missing messages', { provider: getProvider(event), elapsed: Date.now() - start })

  const queue = await createQueue({ provider: { name: 'qstash', token, destination, apiUrl } })
  if (!queue.supports.sendBatch)
    return jsonError(event, 400, 'sendBatch() is not supported', { provider: getProvider(event), elapsed: Date.now() - start })

  await queue.sendBatch?.(messages, options)

  return {
    provider: getProvider(event),
    destination,
    ok: true,
    count: messages.length,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

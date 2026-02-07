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

  if (!Object.prototype.hasOwnProperty.call(body, 'payload'))
    return jsonError(event, 400, 'Missing payload', { provider: getProvider(event), elapsed: Date.now() - start })

  const { payload, options } = body as any
  const queue = await createQueue({ provider: { name: 'qstash', token, destination, apiUrl } })
  const result = await queue.send(payload, options || {})

  return {
    provider: getProvider(event),
    destination,
    ...result,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

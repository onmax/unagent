import type { QueueProvider } from '../../../../../server/_shared/queue'
import { defineEventHandler } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../../../server/_shared/http'
import { clearNetlifyQueueReceipts } from '../../../../../server/_shared/netlify-receipts'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const provider = event.context.params!.provider as QueueProvider
  if (provider !== 'netlify')
    return jsonError(event, 400, 'receipts are only available for the netlify queue provider', { provider, elapsed: Date.now() - start })

  const body = await readJsonBody(event)
  const runId = typeof body.runId === 'string' ? body.runId.trim() : ''

  if (!runId)
    return jsonError(event, 400, 'Missing runId', { provider, elapsed: Date.now() - start })

  try {
    const deleted = await clearNetlifyQueueReceipts(runId)
    return {
      ok: true,
      provider,
      runId,
      deleted,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 500, error instanceof Error ? error.message : String(error), {
      provider,
      runId,
      elapsed: Date.now() - start,
    })
  }
})

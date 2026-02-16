import type { JobsProvider } from '../../../../server/_shared/jobs'
import { defineEventHandler, getQuery } from 'h3'
import { jsonError, nowIso } from '../../../../server/_shared/http'
import { listNetlifyJobsReceipts, readNetlifyJobsReceipt } from '../../../../server/_shared/netlify-jobs-receipts'

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string')
    return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0)
    return fallback
  return parsed
}

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const provider = event.context.params!.provider as JobsProvider
  if (provider !== 'netlify')
    return jsonError(event, 400, 'receipts are only available for the netlify jobs provider', { provider, elapsed: Date.now() - start })

  const query = getQuery(event)
  const runId = typeof query.runId === 'string' ? query.runId.trim() : ''
  const eventId = typeof query.eventId === 'string' ? query.eventId.trim() : ''

  if (!runId)
    return jsonError(event, 400, 'Missing runId', { elapsed: Date.now() - start })

  try {
    if (eventId) {
      const receipt = await readNetlifyJobsReceipt(runId, eventId)
      return {
        ok: true,
        provider,
        runId,
        eventId,
        found: Boolean(receipt),
        receipt: receipt || null,
        elapsed: Date.now() - start,
        timestamp: nowIso(),
      }
    }

    const limit = parsePositiveInt(query.limit, 20)
    const receipts = await listNetlifyJobsReceipts(runId, limit)
    return {
      ok: true,
      provider,
      runId,
      found: receipts.length > 0,
      count: receipts.length,
      receipts,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 500, error instanceof Error ? error.message : String(error), {
      provider,
      runId,
      eventId: eventId || undefined,
      elapsed: Date.now() - start,
    })
  }
})

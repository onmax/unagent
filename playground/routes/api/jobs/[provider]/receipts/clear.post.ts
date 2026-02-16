import type { JobsProvider } from '../../../../../server/_shared/jobs'
import { defineEventHandler } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../../../server/_shared/http'
import { clearNetlifyJobsReceipts } from '../../../../../server/_shared/netlify-jobs-receipts'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const provider = event.context.params!.provider as JobsProvider
  if (provider !== 'netlify')
    return jsonError(event, 400, 'receipts are only available for the netlify jobs provider', { provider, elapsed: Date.now() - start })

  const body = await readJsonBody(event)
  const runId = typeof body.runId === 'string' ? body.runId.trim() : ''

  if (!runId)
    return jsonError(event, 400, 'Missing runId', { provider, elapsed: Date.now() - start })

  try {
    const deleted = await clearNetlifyJobsReceipts(runId)
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

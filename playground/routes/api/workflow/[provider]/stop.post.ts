import type { WorkflowProvider } from '../../../../server/_shared/workflow'
import { defineEventHandler, getQuery } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundWorkflow } from '../../../../server/_shared/workflow'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as WorkflowProvider
  const start = Date.now()
  const query = getQuery(event)
  const body = await readJsonBody(event)
  const runId = (query?.runId ?? (body as any)?.runId) as string | undefined

  if (!runId)
    return jsonError(event, 400, 'Missing runId', { elapsed: Date.now() - start })

  const { workflow } = await createPlaygroundWorkflow(event, provider)
  const run = await workflow.get(runId)
  if (!run)
    return jsonError(event, 404, 'Run not found', { provider, runId, elapsed: Date.now() - start })

  await run.stop()

  return {
    provider,
    runId: run.id,
    stopped: true,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

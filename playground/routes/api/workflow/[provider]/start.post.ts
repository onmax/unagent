import type { WorkflowProvider } from '../../../../server/_shared/workflow'
import { defineEventHandler } from 'h3'
import { nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundWorkflow } from '../../../../server/_shared/workflow'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as WorkflowProvider
  const start = Date.now()
  const body = await readJsonBody(event)
  const payload = (body as any)?.payload ?? body

  const { workflow } = await createPlaygroundWorkflow(event, provider)
  const run = await workflow.start(payload)
  const status = await run.status()

  return {
    provider,
    runId: run.id,
    status,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

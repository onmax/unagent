import type { WorkflowProvider } from '../../../../server/_shared/workflow'
import { defineEventHandler } from 'h3'
import { nowIso } from '../../../../server/_shared/http'
import { createPlaygroundWorkflow } from '../../../../server/_shared/workflow'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as WorkflowProvider
  const start = Date.now()
  const { workflow } = await createPlaygroundWorkflow(event, provider)
  return {
    provider,
    supports: workflow.supports,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

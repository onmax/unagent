import { defineEventHandler } from 'h3'
import { nowIso } from '../../../server/_shared/http'
import { createPlaygroundWorkflow } from '../../../server/_shared/workflow'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, workflow } = await createPlaygroundWorkflow(event)
  return {
    provider,
    supports: workflow.supports,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})

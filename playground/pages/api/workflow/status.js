import { createWorkflow } from 'unagent/workflow'
import { demoWorkflow } from '../../../workflows/demo.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  const start = Date.now()
  try {
    const runId = req.query.runId ?? req.body?.runId
    if (!runId) {
      res.status(400).json({ error: 'Missing runId', elapsed: Date.now() - start, timestamp: new Date().toISOString() })
      return
    }

    const workflow = await createWorkflow({
      provider: { name: 'vercel', workflow: demoWorkflow },
    })

    const run = await workflow.get(runId)
    if (!run) {
      res.status(404).json({ error: 'Run not found', elapsed: Date.now() - start, timestamp: new Date().toISOString() })
      return
    }

    const status = await run.status()

    res.status(200).json({
      provider: 'vercel',
      runId: run.id,
      status,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
}

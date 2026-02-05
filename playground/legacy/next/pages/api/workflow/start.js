import { createWorkflow } from 'unagent/workflow'
import { demoWorkflow } from '../../../workflows/demo.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  const start = Date.now()
  try {
    const body = req.body ?? {}
    const payload = body?.payload ?? body

    const workflow = await createWorkflow({
      provider: { name: 'vercel', workflow: demoWorkflow },
    })

    const run = await workflow.start(payload)
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

import { createWorkflow } from 'unagent/workflow'
import { demoWorkflow } from '../../../workflows/demo.js'

export const config = { runtime: 'nodejs' }

export default async function handler(_req, res) {
  const start = Date.now()
  try {
    const workflow = await createWorkflow({
      provider: { name: 'vercel', workflow: demoWorkflow },
    })

    res.status(200).json({
      provider: 'vercel',
      supports: workflow.supports,
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

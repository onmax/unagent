import { createQueue } from 'unagent/queue'

export const config = { runtime: 'nodejs' }

const TOPIC = 'unagent-playground'

export default async function handler(_req, res) {
  const start = Date.now()
  try {
    const queue = await createQueue({
      provider: { name: 'vercel', topic: TOPIC },
    })

    res.status(200).json({
      provider: 'vercel',
      topic: TOPIC,
      supports: queue.supports,
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


import { createQueue } from 'unagent/queue'

export const config = { runtime: 'nodejs' }

const TOPIC = 'unagent-playground'

export default async function handler(req, res) {
  const start = Date.now()
  try {
    const body = req.body ?? {}
    if (!Object.prototype.hasOwnProperty.call(body, 'payload')) {
      res.status(400).json({
        error: 'Missing payload',
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
      return
    }

    const { payload, options } = body
    const queue = await createQueue({
      provider: { name: 'vercel', topic: TOPIC },
    })

    const result = await queue.send(payload, options)

    res.status(200).json({
      provider: 'vercel',
      topic: TOPIC,
      ...result,
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


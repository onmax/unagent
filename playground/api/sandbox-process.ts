import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSandbox } from 'unagent/sandbox'

async function createVercelSandboxWithRetry(maxAttempts = 3) {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await createSandbox({ provider: { name: 'vercel', runtime: 'node24', timeout: 60_000 } })
    }
    catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      const isRateLimited = /status code 429/i.test(message)
      if (!isRateLimited || attempt === maxAttempts) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 400 * attempt))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const start = Date.now()
  try {
    const sandbox = await createVercelSandboxWithRetry()

    try {
      // Start a background process
      const process = await sandbox.startProcess('sh', ['-c', 'for i in 1 2 3; do echo "tick $i"; sleep 0.5; done; sleep 30'])

      // Poll logs for deterministic matching to avoid stream race edge cases
      const timeoutMs = 10_000
      const pattern = /tick 2/
      const startedAt = Date.now()
      let logs = await process.logs()
      while (!pattern.test(logs.stdout) && Date.now() - startedAt < timeoutMs) {
        await new Promise(resolve => setTimeout(resolve, 150))
        logs = await process.logs()
      }

      if (!pattern.test(logs.stdout)) {
        throw new Error('Timeout waiting for log pattern: /tick 2/')
      }

      const logResult = { line: 'tick 2' }

      // Explicitly stop process after log checks
      await process.kill('SIGTERM')
      const waitResult = await process.wait(10_000)

      // Get final logs
      const finalLogs = await process.logs()

      res.status(200).json({
        provider: 'vercel',
        process: {
          id: process.id,
          command: process.command,
          logResult,
          logsAfterWait: logs,
          waitResult,
          finalLogs,
        },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() })
  }
}

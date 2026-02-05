import { createSandbox } from 'unagent/sandbox'

export const config = { runtime: 'nodejs' }

export default async function handler(_req, res) {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({
      provider: {
        name: 'vercel',
        runtime: 'node24',
        timeout: 30_000,
      },
    })
    const createTime = Date.now() - start

    try {
      const exec = await sandbox.exec('echo', ['Hello from sandbox!'])
      await sandbox.writeFile('/tmp/test.txt', 'File content works!')
      const content = await sandbox.readFile('/tmp/test.txt')

      res.status(200).json({
        provider: 'vercel',
        createTime,
        exec,
        content,
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
}

import { defineEventHandler } from 'h3'
import { createSandbox } from 'unagent/sandbox'

export default defineEventHandler(async () => {
  const sandbox = await createSandbox({
    provider: { name: 'vercel', runtime: 'node24', timeout: 30_000 },
  })

  try {
    const exec = await sandbox.exec('echo', ['Hello from sandbox!'])
    return { ok: true, exec }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, reason: message }
  }
  finally {
    await sandbox.stop()
  }
})


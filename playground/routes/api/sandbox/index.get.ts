import { defineEventHandler } from 'h3'
import { nowIso } from '../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, sandbox } = await createPlaygroundSandbox(event)
  try {
    const exec = await sandbox.exec('echo', ['Hello from sandbox!'])
    await sandbox.writeFile('/tmp/test.txt', 'File content works!')
    const content = await sandbox.readFile('/tmp/test.txt')

    return {
      provider,
      exec,
      content,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})

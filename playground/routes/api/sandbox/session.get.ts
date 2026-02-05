import { defineEventHandler } from 'h3'
import { jsonError, nowIso } from '../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, sandbox } = await createPlaygroundSandbox(event)
  try {
    if (provider !== 'cloudflare' || !sandbox.cloudflare) {
      return jsonError(event, 400, 'sessions are only supported on Cloudflare', {
        provider,
        elapsed: Date.now() - start,
      })
    }

    const session = await sandbox.cloudflare.createSession({ cwd: '/tmp' })
    const execResult = await session.exec('echo "session test"')
    await sandbox.cloudflare.deleteSession(session.id)

    return {
      provider,
      session: { id: session.id, execResult },
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})

import { defineEventHandler } from 'h3'
import { jsonError, nowIso } from '../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, sandbox } = await createPlaygroundSandbox(event)
  try {
    if (provider !== 'cloudflare' || !sandbox.cloudflare) {
      return jsonError(event, 400, 'git is only supported on Cloudflare', {
        provider,
        elapsed: Date.now() - start,
      })
    }

    const result = await sandbox.cloudflare.gitCheckout('https://github.com/onmax/unagent', { depth: 1 })
    return {
      provider,
      git: result,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})

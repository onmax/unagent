import { defineEventHandler } from 'h3'
import { nowIso } from '../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, sandbox } = await createPlaygroundSandbox(event)
  try {
    return {
      provider,
      supports: sandbox.supports,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})

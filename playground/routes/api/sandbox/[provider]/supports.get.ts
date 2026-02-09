import type { SandboxProvider } from '../../../../server/_shared/sandbox'
import { defineEventHandler } from 'h3'
import { nowIso } from '../../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as SandboxProvider
  const start = Date.now()
  const { sandbox } = await createPlaygroundSandbox(event, provider)
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

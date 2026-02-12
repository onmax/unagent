import type { SandboxProvider } from '../../../../server/_shared/sandbox'
import { defineEventHandler } from 'h3'
import { SandboxError } from 'unagent/sandbox'
import { jsonError, nowIso } from '../../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as SandboxProvider
  const start = Date.now()
  let sandbox: Awaited<ReturnType<typeof createPlaygroundSandbox>>['sandbox'] | null = null
  try {
    const created = await createPlaygroundSandbox(event, provider)
    sandbox = created.sandbox
    return {
      provider,
      supports: sandbox.supports,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    if (error instanceof SandboxError) {
      return jsonError(event, 400, error.message, {
        provider,
        code: error.code,
        sandboxProvider: error.provider,
        details: error.details,
        elapsed: Date.now() - start,
      })
    }
    return jsonError(event, 500, error instanceof Error ? error.message : String(error), {
      provider,
      elapsed: Date.now() - start,
    })
  }
  finally {
    if (sandbox)
      await sandbox.stop()
  }
})

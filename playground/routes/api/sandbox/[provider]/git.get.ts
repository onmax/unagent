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
  catch (error) {
    if (error instanceof SandboxError) {
      const CLIENT_ERRORS = new Set(['NOT_SUPPORTED', 'INVALID_ARGUMENT', 'DENO_CONFIG_INVALID'])
      const status = error.code === 'TIMEOUT' ? 504 : CLIENT_ERRORS.has(error.code ?? '') ? 400 : 500
      return jsonError(event, status, error.message, {
        provider,
        code: error.code,
        sandboxProvider: error.provider,
        details: error.details,
        cause: error.cause instanceof Error ? error.cause.message : error.cause,
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

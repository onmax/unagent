import type { SandboxProvider } from '../../../../server/_shared/sandbox'
import { defineEventHandler, getRequestURL } from 'h3'
import { jsonError, nowIso } from '../../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as SandboxProvider
  const start = Date.now()
  const { sandbox } = await createPlaygroundSandbox(event, provider)
  try {
    if (provider !== 'cloudflare' || !sandbox.cloudflare) {
      return jsonError(event, 400, 'ports are only supported on Cloudflare', {
        provider,
        elapsed: Date.now() - start,
      })
    }

    const hostname = getRequestURL(event).hostname
    if (hostname.endsWith('.workers.dev')) {
      return {
        provider,
        ports: {
          supported: false,
          reason: 'custom_domain_required',
          message: 'Port preview URLs require a custom domain. *.workers.dev does not support wildcard subdomains.',
          hostname,
        },
        elapsed: Date.now() - start,
        timestamp: nowIso(),
      }
    }

    const exposed = await sandbox.cloudflare.exposePort(8080, { protocol: 'http', hostname })
    const ports = await sandbox.cloudflare.getExposedPorts(hostname)

    return {
      provider,
      ports: { supported: true, hostname, exposed, list: ports },
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})

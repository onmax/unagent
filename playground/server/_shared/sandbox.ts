import { createSandbox } from 'unagent/sandbox'
import { getCloudflareEnv } from './provider'

export type SandboxProvider = 'cloudflare' | 'vercel' | 'deno'

export async function createPlaygroundSandbox(event: any, provider: SandboxProvider, opts?: { ports?: number[] }): Promise<{ provider: string, sandbox: any }> {
  if (provider === 'cloudflare') {
    const env = getCloudflareEnv(event)
    if (!env)
      throw new Error('Missing Cloudflare env bindings')
    const { getSandbox } = await import('@cloudflare/sandbox')
    return {
      provider,
      sandbox: await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } }),
    }
  }

  if (provider === 'vercel') {
    const token = process.env.VERCEL_TOKEN
    const teamId = process.env.VERCEL_TEAM_ID
    const projectId = process.env.VERCEL_PROJECT_ID
    const credentials = token && teamId && projectId ? { token, teamId, projectId } : undefined
    return {
      provider,
      sandbox: await createSandbox({
        provider: {
          name: 'vercel',
          runtime: 'node24',
          timeout: 30_000,
          ...(opts?.ports ? { ports: opts.ports } : {}),
          ...(credentials ? { credentials } : {}),
        },
      }),
    }
  }

  if (provider === 'deno') {
    return {
      provider,
      sandbox: await createSandbox({ provider: { name: 'deno' } }),
    }
  }

  throw new Error(`Sandbox provider "${provider}" is not supported`)
}

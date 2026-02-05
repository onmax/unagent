import { createSandbox } from 'unagent/sandbox'
import { getCloudflareEnv, getProvider } from './provider'

export async function createPlaygroundSandbox(event: any, opts?: { ports?: number[] }): Promise<{ provider: string, sandbox: any }> {
  const provider = getProvider(event)
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
    return {
      provider,
      sandbox: await createSandbox({
        provider: {
          name: 'vercel',
          runtime: 'node24',
          timeout: 30_000,
          ...(opts?.ports ? { ports: opts.ports } : {}),
        },
      }),
    }
  }

  throw new Error('Sandbox is not available on this runtime')
}

import type { H3Event } from 'h3'
import type { CloudflareEnv } from './cloudflare-env'

export type PlaygroundProvider = 'cloudflare' | 'vercel' | 'netlify' | 'node'

export function getCloudflareEnv(event: H3Event): CloudflareEnv | null {
  const env = (event.context as any)?.cloudflare?.env
  return env && typeof env === 'object' ? (env as CloudflareEnv) : null
}

export function getProvider(event: H3Event): PlaygroundProvider {
  if (getCloudflareEnv(event))
    return 'cloudflare'

  // Netlify sets these in deploys and often in local dev.
  if (process.env.NETLIFY || process.env.NETLIFY_LOCAL)
    return 'netlify'

  // Vercel sets these in both build output deployments and `vercel dev`.
  if (process.env.VERCEL || process.env.VERCEL_ENV)
    return 'vercel'

  return 'node'
}

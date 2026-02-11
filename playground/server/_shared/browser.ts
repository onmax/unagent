import { createBrowser } from 'unagent/browser'
import { getCloudflareEnv } from './provider'

export type BrowserProvider = 'cloudflare' | 'browserbase' | 'playwright'

export async function createPlaygroundBrowser(event: any, provider: BrowserProvider): Promise<{ provider: BrowserProvider, browser: any }> {
  if (provider === 'cloudflare') {
    const env = getCloudflareEnv(event)
    if (!env?.MYBROWSER)
      throw new Error('Missing Cloudflare browser binding (MYBROWSER)')

    return {
      provider,
      browser: await createBrowser({
        provider: {
          name: 'cloudflare',
          binding: 'MYBROWSER',
        },
      }),
    }
  }

  if (provider === 'browserbase') {
    return {
      provider,
      browser: await createBrowser({
        provider: {
          name: 'browserbase',
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
        },
      }),
    }
  }

  if (provider === 'playwright') {
    return {
      provider,
      browser: await createBrowser({
        provider: { name: 'playwright' },
      }),
    }
  }

  throw new Error(`Browser provider "${provider}" is not supported`)
}

import { createCron } from 'unagent/cron'

export type CronProvider = 'qstash' | 'cloudflare' | 'vercel'

export async function createPlaygroundCron(_event: any, provider: CronProvider): Promise<{ provider: string, cron: any }> {
  if (provider === 'qstash') {
    const token = process.env.QSTASH_TOKEN
    if (!token)
      throw new Error('Missing QSTASH_TOKEN')
    return {
      provider,
      cron: createCron({ provider: { name: 'qstash', token, ...(process.env.QSTASH_API_URL ? { apiUrl: process.env.QSTASH_API_URL } : {}) } }),
    }
  }

  if (provider === 'cloudflare') {
    const accountId = process.env.CF_ACCOUNT_ID
    const apiToken = process.env.CF_API_TOKEN
    const scriptName = process.env.CF_SCRIPT_NAME
    if (!accountId || !apiToken || !scriptName)
      throw new Error('Missing CF_ACCOUNT_ID, CF_API_TOKEN, or CF_SCRIPT_NAME')
    return {
      provider,
      cron: createCron({ provider: { name: 'cloudflare', accountId, apiToken, scriptName } }),
    }
  }

  if (provider === 'vercel') {
    const token = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID
    if (!token || !projectId)
      throw new Error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID')
    const teamId = process.env.VERCEL_TEAM_ID
    return {
      provider,
      cron: createCron({ provider: { name: 'vercel', token, projectId, ...(teamId ? { teamId } : {}) } }),
    }
  }

  throw new Error(`Unknown cron provider: ${provider}`)
}

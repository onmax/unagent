import type { CronClient, CronDetectionResult, CronOptions, CronProvider, CronProviderOptions } from './types'
import type { CloudflareCronProviderOptions } from './types/cloudflare'
import type { QStashCronProviderOptions } from './types/qstash'
import type { VercelCronProviderOptions } from './types/vercel'
import { CloudflareCronAdapter, QStashCronAdapter, VercelCronAdapter } from './adapters'
import { CronError } from './errors'

export { defineCronSchedules, toCloudflareCrons, toVercelCrons } from './config'
export type { CronDefinition } from './config'
export { CronError, NotSupportedError } from './errors'
export type { CloudflareCronClient, CloudflareCronNamespace, CloudflareCronProviderOptions } from './types'
export type { CreateScheduleOptions, CronCapabilities, CronClient, CronDetectionResult, CronOptions, CronProvider, CronProviderOptions, CronSchedule } from './types'
export type { QStashCronClient, QStashCronNamespace, QStashCronProviderOptions } from './types'
export type { VercelCronClient, VercelCronNamespace, VercelCronProviderOptions } from './types'

export function detectCron(): CronDetectionResult {
  if (typeof process !== 'undefined' && process.env.QSTASH_TOKEN)
    return { type: 'qstash', details: { hasToken: true } }
  if (typeof process !== 'undefined' && process.env.CF_ACCOUNT_ID)
    return { type: 'cloudflare', details: { accountId: process.env.CF_ACCOUNT_ID } }
  if (typeof process !== 'undefined' && process.env.VERCEL_TOKEN)
    return { type: 'vercel', details: { hasToken: true } }
  return { type: 'none' }
}

export function isCronAvailable(provider: CronProvider): boolean {
  if (provider === 'qstash')
    return typeof fetch === 'function' && typeof process !== 'undefined' && !!process.env.QSTASH_TOKEN
  if (provider === 'cloudflare')
    return typeof process !== 'undefined' && !!process.env.CF_ACCOUNT_ID && !!process.env.CF_API_TOKEN && !!process.env.CF_SCRIPT_NAME
  if (provider === 'vercel')
    return typeof process !== 'undefined' && !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_PROJECT_ID
  return false
}

function resolveProvider(provider?: CronProviderOptions): CronProviderOptions {
  if (provider)
    return provider

  if (typeof process !== 'undefined') {
    if (process.env.QSTASH_TOKEN)
      return { name: 'qstash', token: process.env.QSTASH_TOKEN }
    if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN && process.env.CF_SCRIPT_NAME)
      return { name: 'cloudflare', accountId: process.env.CF_ACCOUNT_ID, scriptName: process.env.CF_SCRIPT_NAME, apiToken: process.env.CF_API_TOKEN }
    if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID)
      return { name: 'vercel', token: process.env.VERCEL_TOKEN, projectId: process.env.VERCEL_PROJECT_ID, teamId: process.env.VERCEL_TEAM_ID }
  }

  throw new CronError('Unable to auto-detect cron provider. Pass { provider }.')
}

export function createCron(opts: { provider: QStashCronProviderOptions }): CronClient<'qstash'>
export function createCron(opts: { provider: CloudflareCronProviderOptions }): CronClient<'cloudflare'>
export function createCron(opts: { provider: VercelCronProviderOptions }): CronClient<'vercel'>
export function createCron(opts?: CronOptions): CronClient
export function createCron(options: CronOptions = {}): CronClient {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'qstash') {
    const { token, apiUrl } = resolved as QStashCronProviderOptions
    if (!token)
      throw new CronError('[qstash] token is required')
    return new QStashCronAdapter(token, apiUrl)
  }

  if (resolved.name === 'cloudflare') {
    const { accountId, scriptName, apiToken, apiUrl } = resolved as CloudflareCronProviderOptions
    if (!accountId || !scriptName || !apiToken)
      throw new CronError('[cloudflare] accountId, scriptName, and apiToken are required')
    return new CloudflareCronAdapter(accountId, scriptName, apiToken, apiUrl)
  }

  if (resolved.name === 'vercel') {
    const { token, projectId, teamId, apiUrl } = resolved as VercelCronProviderOptions
    if (!token || !projectId)
      throw new CronError('[vercel] token and projectId are required')
    return new VercelCronAdapter(token, projectId, teamId, apiUrl)
  }

  throw new CronError(`Unknown cron provider: ${(resolved as { name: string }).name}`)
}

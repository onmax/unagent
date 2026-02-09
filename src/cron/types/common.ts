import type { CloudflareCronProviderOptions } from './cloudflare'
import type { QStashCronProviderOptions } from './qstash'
import type { VercelCronProviderOptions } from './vercel'

export type CronProvider = 'qstash' | 'cloudflare' | 'vercel'

export interface CronCapabilities {
  create: boolean
  list: boolean
  get: boolean
  delete: boolean
  pause: boolean
  resume: boolean
}

export interface CronSchedule {
  id: string
  cron: string
  destination: string
  paused: boolean
  createdAt?: string
  raw: unknown
}

export interface CreateScheduleOptions {
  cron: string
  destination: string
  body?: unknown
  method?: string
  headers?: Record<string, string>
  retries?: number
  timeout?: string
  scheduleId?: string
}

export type CronProviderOptions = QStashCronProviderOptions | CloudflareCronProviderOptions | VercelCronProviderOptions

export interface CronOptions {
  provider?: CronProviderOptions
}

export interface CronDetectionResult {
  type: CronProvider | 'none'
  details?: Record<string, unknown>
}

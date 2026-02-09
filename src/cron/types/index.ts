import type { CloudflareCronNamespace } from './cloudflare'
import type { CreateScheduleOptions, CronCapabilities, CronProvider, CronSchedule } from './common'
import type { QStashCronNamespace } from './qstash'
import type { VercelCronNamespace } from './vercel'

export type * from './cloudflare'
export type * from './common'
export type * from './qstash'
export type * from './vercel'

export interface CronClient<P extends CronProvider = CronProvider> {
  readonly provider: P
  readonly supports: CronCapabilities

  create: (options: CreateScheduleOptions) => Promise<CronSchedule>
  list: () => Promise<CronSchedule[]>
  get: (id: string) => Promise<CronSchedule>
  delete: (id: string) => Promise<void>
  pause: (id: string) => Promise<void>
  resume: (id: string) => Promise<void>

  readonly qstash: P extends 'qstash' ? QStashCronNamespace : never
  readonly cloudflare: P extends 'cloudflare' ? CloudflareCronNamespace : never
  readonly vercel: P extends 'vercel' ? VercelCronNamespace : never
}

export type QStashCronClient = CronClient<'qstash'>
export type CloudflareCronClient = CronClient<'cloudflare'>
export type VercelCronClient = CronClient<'vercel'>

import type { CloudflareCronNamespace } from '../types/cloudflare'
import type { CreateScheduleOptions, CronCapabilities, CronProvider, CronSchedule } from '../types/common'
import type { CronClient } from '../types/index'
import type { QStashCronNamespace } from '../types/qstash'
import type { VercelCronNamespace } from '../types/vercel'
import { NotSupportedError } from '../errors'

export abstract class BaseCronAdapter implements CronClient {
  abstract readonly provider: CronProvider
  abstract readonly supports: CronCapabilities

  async create(_options: CreateScheduleOptions): Promise<CronSchedule> {
    throw new NotSupportedError('create', this.provider)
  }

  async list(): Promise<CronSchedule[]> {
    throw new NotSupportedError('list', this.provider)
  }

  async get(_id: string): Promise<CronSchedule> {
    throw new NotSupportedError('get', this.provider)
  }

  async delete(_id: string): Promise<void> {
    throw new NotSupportedError('delete', this.provider)
  }

  async pause(_id: string): Promise<void> {
    throw new NotSupportedError('pause', this.provider)
  }

  async resume(_id: string): Promise<void> {
    throw new NotSupportedError('resume', this.provider)
  }

  get qstash(): QStashCronNamespace {
    throw new NotSupportedError('qstash namespace', this.provider)
  }

  get cloudflare(): CloudflareCronNamespace {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }

  get vercel(): VercelCronNamespace {
    throw new NotSupportedError('vercel namespace', this.provider)
  }
}

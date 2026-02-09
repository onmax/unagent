import type { CloudflareCronNamespace } from '../types/cloudflare'
import type { CreateScheduleOptions, CronCapabilities, CronSchedule } from '../types/common'
import { CronError } from '../errors'
import { BaseCronAdapter } from './base'

async function readJson(res: Response): Promise<any> {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  }
  catch {
    return { raw: text }
  }
}

export class CloudflareCronAdapter extends BaseCronAdapter {
  readonly provider = 'cloudflare' as const
  readonly supports: CronCapabilities = { create: true, list: true, get: true, delete: true, pause: false, resume: false }

  private accountId: string
  private scriptName: string
  private apiToken: string
  private apiUrl: string

  constructor(accountId: string, scriptName: string, apiToken: string, apiUrl?: string) {
    super()
    this.accountId = accountId
    this.scriptName = scriptName
    this.apiToken = apiToken
    this.apiUrl = apiUrl || 'https://api.cloudflare.com'
  }

  private get schedulesUrl(): string {
    return `${this.apiUrl.replace(/\/$/, '')}/client/v4/accounts/${this.accountId}/workers/scripts/${this.scriptName}/schedules`
  }

  private get headers(): HeadersInit {
    return { 'authorization': `Bearer ${this.apiToken}`, 'content-type': 'application/json' }
  }

  private async fetchSchedules(): Promise<any[]> {
    const res = await fetch(this.schedulesUrl, { headers: this.headers })
    const json = await readJson(res)
    if (!res.ok)
      throw new CronError(`[cloudflare] fetch schedules failed (${res.status}): ${json?.errors?.[0]?.message ?? res.statusText}`)
    return json?.result?.schedules ?? []
  }

  private async putSchedules(schedules: { cron: string }[]): Promise<void> {
    const res = await fetch(this.schedulesUrl, { method: 'PUT', headers: this.headers, body: JSON.stringify(schedules) })
    if (!res.ok) {
      const json = await readJson(res)
      throw new CronError(`[cloudflare] update schedules failed (${res.status}): ${json?.errors?.[0]?.message ?? res.statusText}`)
    }
  }

  private mapSchedule(s: any): CronSchedule {
    return { id: s.cron, cron: s.cron, destination: this.scriptName, paused: false, raw: s }
  }

  override async list(): Promise<CronSchedule[]> {
    const schedules = await this.fetchSchedules()
    return schedules.map(s => this.mapSchedule(s))
  }

  override async get(id: string): Promise<CronSchedule> {
    const all = await this.list()
    const found = all.find(s => s.id === id)
    if (!found)
      throw new CronError(`[cloudflare] schedule not found: ${id}`)
    return found
  }

  override async create(options: CreateScheduleOptions): Promise<CronSchedule> {
    const existing = await this.fetchSchedules()
    existing.push({ cron: options.cron })
    await this.putSchedules(existing)
    return { id: options.cron, cron: options.cron, destination: this.scriptName, paused: false, raw: { cron: options.cron } }
  }

  override async delete(id: string): Promise<void> {
    const existing = await this.fetchSchedules()
    const filtered = existing.filter((s: any) => s.cron !== id)
    if (filtered.length === existing.length)
      throw new CronError(`[cloudflare] schedule not found: ${id}`)
    await this.putSchedules(filtered)
  }

  override get cloudflare(): CloudflareCronNamespace {
    return { accountId: this.accountId, scriptName: this.scriptName }
  }
}

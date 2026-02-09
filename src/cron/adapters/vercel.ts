import type { CronCapabilities, CronSchedule } from '../types/common'
import type { VercelCronNamespace } from '../types/vercel'
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

export class VercelCronAdapter extends BaseCronAdapter {
  readonly provider = 'vercel' as const
  readonly supports: CronCapabilities = { create: false, list: true, get: true, delete: false, pause: false, resume: false }

  private token: string
  private projectId: string
  private teamId?: string
  private apiUrl: string

  constructor(token: string, projectId: string, teamId?: string, apiUrl?: string) {
    super()
    this.token = token
    this.projectId = projectId
    this.teamId = teamId
    this.apiUrl = apiUrl || 'https://api.vercel.com'
  }

  override async list(): Promise<CronSchedule[]> {
    const query = this.teamId ? `?teamId=${this.teamId}` : ''
    const res = await fetch(`${this.apiUrl.replace(/\/$/, '')}/v1/projects/${this.projectId}/crons${query}`, {
      headers: { authorization: `Bearer ${this.token}` },
    })
    const json = await readJson(res)
    if (!res.ok)
      throw new CronError(`[vercel] list crons failed (${res.status}): ${json?.error?.message ?? res.statusText}`)

    return (json?.crons ?? []).map((c: any): CronSchedule => ({
      id: c.id,
      cron: c.schedule,
      destination: c.path,
      paused: !c.enabledAt,
      raw: c,
    }))
  }

  override async get(id: string): Promise<CronSchedule> {
    const all = await this.list()
    const found = all.find(s => s.id === id)
    if (!found)
      throw new CronError(`[vercel] cron not found: ${id}`)
    return found
  }

  override get vercel(): VercelCronNamespace {
    return { projectId: this.projectId }
  }
}

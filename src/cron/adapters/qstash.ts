import type { CreateScheduleOptions, CronCapabilities, CronSchedule } from '../types/common'
import type { QStashCronNamespace } from '../types/qstash'
import { CronError } from '../errors'
import { BaseCronAdapter } from './base'

function buildRequestHeaders(token: string, extra?: Record<string, string>): Headers {
  const headers = new Headers(extra)
  headers.set('authorization', `Bearer ${token}`)
  return headers
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  }
  catch {
    return { raw: text }
  }
}

function mapSchedule(item: any): CronSchedule {
  return { id: item.scheduleId, cron: item.cron, destination: item.destination, paused: item.isPaused ?? false, createdAt: item.createdAt, raw: item }
}

export class QStashCronAdapter extends BaseCronAdapter {
  readonly provider = 'qstash' as const
  readonly supports: CronCapabilities = { create: true, list: true, get: true, delete: true, pause: true, resume: true }

  private token: string
  private apiUrl: string

  constructor(token: string, apiUrl?: string) {
    super()
    this.token = token
    this.apiUrl = apiUrl || 'https://qstash.upstash.io'
  }

  private url(path: string): string {
    return `${this.apiUrl.replace(/\/$/, '')}${path}`
  }

  override async create(options: CreateScheduleOptions): Promise<CronSchedule> {
    if (typeof fetch !== 'function')
      throw new CronError('[qstash] fetch is not available in this runtime')

    const extra: Record<string, string> = { 'upstash-cron': options.cron }
    if (options.scheduleId)
      extra['upstash-schedule-id'] = options.scheduleId
    if (options.method)
      extra['upstash-method'] = options.method
    if (options.retries !== undefined)
      extra['upstash-retries'] = String(options.retries)
    if (options.timeout)
      extra['upstash-timeout'] = options.timeout
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers))
        extra[`upstash-forward-${k}`] = v
    }

    const body = options.body ? JSON.stringify(options.body) : undefined
    if (body)
      extra['content-type'] = 'application/json'

    const res = await fetch(this.url(`/v2/schedules/${encodeURIComponent(options.destination)}`), {
      method: 'POST',
      headers: buildRequestHeaders(this.token, extra),
      body,
    })
    const json = await readJson(res)
    if (!res.ok)
      throw new CronError(`[qstash] create schedule failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)

    return { id: json.scheduleId, cron: options.cron, destination: options.destination, paused: false, raw: json }
  }

  override async list(): Promise<CronSchedule[]> {
    if (typeof fetch !== 'function')
      throw new CronError('[qstash] fetch is not available in this runtime')

    const res = await fetch(this.url('/v2/schedules'), { headers: buildRequestHeaders(this.token) })
    const json = await readJson(res)
    if (!res.ok)
      throw new CronError(`[qstash] list schedules failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)

    return (Array.isArray(json) ? json : []).map(mapSchedule)
  }

  override async get(id: string): Promise<CronSchedule> {
    if (typeof fetch !== 'function')
      throw new CronError('[qstash] fetch is not available in this runtime')

    const res = await fetch(this.url(`/v2/schedules/${encodeURIComponent(id)}`), { headers: buildRequestHeaders(this.token) })
    const json = await readJson(res)
    if (!res.ok)
      throw new CronError(`[qstash] get schedule failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)

    return mapSchedule(json)
  }

  override async delete(id: string): Promise<void> {
    if (typeof fetch !== 'function')
      throw new CronError('[qstash] fetch is not available in this runtime')

    const res = await fetch(this.url(`/v2/schedules/${encodeURIComponent(id)}`), { method: 'DELETE', headers: buildRequestHeaders(this.token) })
    if (!res.ok) {
      const json = await readJson(res)
      throw new CronError(`[qstash] delete schedule failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)
    }
  }

  override async pause(id: string): Promise<void> {
    if (typeof fetch !== 'function')
      throw new CronError('[qstash] fetch is not available in this runtime')

    const res = await fetch(this.url(`/v2/schedules/${encodeURIComponent(id)}/pause`), { method: 'POST', headers: buildRequestHeaders(this.token) })
    if (!res.ok) {
      const json = await readJson(res)
      throw new CronError(`[qstash] pause schedule failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)
    }
  }

  override async resume(id: string): Promise<void> {
    if (typeof fetch !== 'function')
      throw new CronError('[qstash] fetch is not available in this runtime')

    const res = await fetch(this.url(`/v2/schedules/${encodeURIComponent(id)}/resume`), { method: 'POST', headers: buildRequestHeaders(this.token) })
    if (!res.ok) {
      const json = await readJson(res)
      throw new CronError(`[qstash] resume schedule failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)
    }
  }

  override get qstash(): QStashCronNamespace {
    return { apiUrl: this.apiUrl }
  }
}

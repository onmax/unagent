import type { QueueBatchMessage, QueueCapabilities, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from '../types/common'
import type { QStashQueueNamespace } from '../types/qstash'
import { QueueError } from '../errors'
import { BaseQueueAdapter } from './base'

function asDurationSeconds(seconds: number): string {
  return `${seconds}s`
}

function buildRequestHeaders(token: string, extra?: Record<string, string>): Headers {
  const headers = new Headers(extra)
  headers.set('authorization', `Bearer ${token}`)
  return headers
}

function buildMessageHeaders(options: QueueSendOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {}
  if (options.idempotencyKey)
    headers['upstash-deduplication-id'] = options.idempotencyKey
  if (options.delaySeconds !== undefined)
    headers['upstash-delay'] = asDurationSeconds(options.delaySeconds)
  return headers
}

function encodeBody(payload: unknown, contentType?: string): { body: string, contentType: string } {
  if (contentType === 'text')
    return { body: String(payload ?? ''), contentType: 'text/plain; charset=utf-8' }
  return { body: JSON.stringify(payload ?? null), contentType: 'application/json; charset=utf-8' }
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

export class QStashQueueAdapter extends BaseQueueAdapter {
  readonly provider = 'qstash' as const
  readonly supports: QueueCapabilities = { sendBatch: true }

  private token: string
  private destination: string
  private apiUrl: string

  constructor(token: string, destination: string, apiUrl?: string) {
    super()
    this.token = token
    this.destination = destination
    this.apiUrl = apiUrl || 'https://qstash.upstash.io'
  }

  async send<T = unknown>(payload: T, options: QueueSendOptions = {}): Promise<QueueSendResult> {
    if (typeof fetch !== 'function')
      throw new QueueError('[qstash] fetch is not available in this runtime')

    const { body, contentType } = encodeBody(payload, options.contentType)
    const headers = buildRequestHeaders(this.token, { 'content-type': contentType, ...buildMessageHeaders(options) })

    // QStash publish endpoint expects destination in the path.
    const url = `${this.apiUrl.replace(/\/$/, '')}/v2/publish/${encodeURIComponent(this.destination)}`
    const res = await fetch(url, { method: 'POST', headers, body })
    const json = await readJson(res)

    if (!res.ok) {
      throw new QueueError(`[qstash] publish failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)
    }

    const messageId = json?.messageId ?? json?.message_id ?? json?.id
    return { messageId: typeof messageId === 'string' ? messageId : undefined }
  }

  override async sendBatch(messages: QueueBatchMessage[], options: QueueSendBatchOptions = {}): Promise<void> {
    if (typeof fetch !== 'function')
      throw new QueueError('[qstash] fetch is not available in this runtime')

    const url = `${this.apiUrl.replace(/\/$/, '')}/v2/batch`

    const items = messages.map((m: QueueBatchMessage) => {
      const { body, contentType } = encodeBody(m.body, m.contentType)
      const messageHeaders = { 'content-type': contentType, ...buildMessageHeaders({ delaySeconds: options.delaySeconds } as any) }
      return {
        destination: this.destination,
        headers: messageHeaders,
        body,
      }
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: buildRequestHeaders(this.token, { 'content-type': 'application/json; charset=utf-8' }),
      body: JSON.stringify(items),
    })
    const json = await readJson(res)
    if (!res.ok) {
      throw new QueueError(`[qstash] batch publish failed (${res.status}): ${typeof json?.error === 'string' ? json.error : res.statusText}`)
    }
  }

  override get qstash(): QStashQueueNamespace {
    return { destination: this.destination, apiUrl: this.apiUrl }
  }
}

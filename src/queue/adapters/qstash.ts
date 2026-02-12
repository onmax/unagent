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

function getUpstreamErrorMessage(payload: any, fallback: string): string {
  const errorValue = payload?.error ?? payload?.message ?? payload?.detail
  if (typeof errorValue === 'string' && errorValue.trim())
    return errorValue
  if (typeof payload?.raw === 'string' && payload.raw.trim())
    return payload.raw
  return fallback
}

function mapPublishFailureCode(status: number): string {
  if (status === 400 || status === 404)
    return 'QSTASH_CONFIG_INVALID'
  if (status === 401 || status === 403)
    return 'QSTASH_AUTH_FAILED'
  return 'QSTASH_PUBLISH_FAILED'
}

function mapStatusToHttpStatus(status: number): number {
  if (status >= 400 && status < 500)
    return status
  return 502
}

export class QStashQueueAdapter extends BaseQueueAdapter {
  readonly provider = 'qstash' as const
  readonly supports: QueueCapabilities = { sendBatch: true }

  private token: string
  private destination?: string
  private apiUrl: string

  constructor(token: string, destination?: string, apiUrl?: string) {
    super()
    this.token = token
    this.destination = destination
    this.apiUrl = apiUrl || 'https://qstash.upstash.io'
  }

  private getDestination(operation: 'send' | 'sendBatch'): string {
    if (!this.destination) {
      throw new QueueError('[qstash] destination is required for publish operations', {
        code: 'QSTASH_CONFIG_INVALID',
        provider: 'qstash',
        httpStatus: 400,
        details: {
          operation,
          missing: ['destination'],
        },
      })
    }
    return this.destination
  }

  async send<T = unknown>(payload: T, options: QueueSendOptions = {}): Promise<QueueSendResult> {
    if (typeof fetch !== 'function') {
      throw new QueueError('[qstash] fetch is not available in this runtime', {
        code: 'QSTASH_RUNTIME_UNAVAILABLE',
        provider: 'qstash',
        httpStatus: 500,
      })
    }

    const destination = this.getDestination('send')

    const { body, contentType } = encodeBody(payload, options.contentType)
    const headers = buildRequestHeaders(this.token, { 'content-type': contentType, ...buildMessageHeaders(options) })

    // QStash publish endpoint expects destination in the path.
    const url = `${this.apiUrl.replace(/\/$/, '')}/v2/publish/${encodeURIComponent(destination)}`
    const res = await fetch(url, { method: 'POST', headers, body })
    const json = await readJson(res)

    if (!res.ok) {
      const upstreamError = getUpstreamErrorMessage(json, res.statusText)
      const code = mapPublishFailureCode(res.status)
      throw new QueueError(`[qstash] publish failed (${res.status}): ${upstreamError}`, {
        code,
        provider: 'qstash',
        httpStatus: mapStatusToHttpStatus(res.status),
        upstreamError,
        details: {
          status: res.status,
          statusText: res.statusText,
          endpoint: url,
        },
      })
    }

    const messageId = json?.messageId ?? json?.message_id ?? json?.id
    return { messageId: typeof messageId === 'string' ? messageId : undefined }
  }

  override async sendBatch(messages: QueueBatchMessage[], options: QueueSendBatchOptions = {}): Promise<void> {
    if (typeof fetch !== 'function') {
      throw new QueueError('[qstash] fetch is not available in this runtime', {
        code: 'QSTASH_RUNTIME_UNAVAILABLE',
        provider: 'qstash',
        httpStatus: 500,
      })
    }

    const destination = this.getDestination('sendBatch')

    const url = `${this.apiUrl.replace(/\/$/, '')}/v2/batch`

    const items = messages.map((m: QueueBatchMessage) => {
      const { body, contentType } = encodeBody(m.body, m.contentType)
      const messageHeaders = { 'content-type': contentType, ...buildMessageHeaders({ delaySeconds: options.delaySeconds } as any) }
      return {
        destination,
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
      const upstreamError = getUpstreamErrorMessage(json, res.statusText)
      const code = mapPublishFailureCode(res.status)
      throw new QueueError(`[qstash] batch publish failed (${res.status}): ${upstreamError}`, {
        code,
        provider: 'qstash',
        httpStatus: mapStatusToHttpStatus(res.status),
        upstreamError,
        details: {
          status: res.status,
          statusText: res.statusText,
          endpoint: url,
        },
      })
    }
  }

  override get qstash(): QStashQueueNamespace {
    return { destination: this.destination, apiUrl: this.apiUrl }
  }
}

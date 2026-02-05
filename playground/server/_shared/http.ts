import type { H3Event } from 'h3'
import { readBody, setResponseStatus } from 'h3'

export function nowIso(): string {
  return new Date().toISOString()
}

export function jsonError(event: H3Event, status: number, message: string, extra?: Record<string, unknown>): Record<string, unknown> {
  setResponseStatus(event, status)
  return {
    error: message,
    ...(extra || {}),
    timestamp: nowIso(),
  }
}

export async function readJsonBody(event: H3Event): Promise<Record<string, unknown>> {
  try {
    const body = await readBody(event)
    if (body && typeof body === 'object')
      return body as Record<string, unknown>
    return {}
  }
  catch {
    return {}
  }
}

import type { UsageInfo } from '../usage'

export type StreamPart
  = | { type: 'text', data: string }
    | { type: 'tool_call', data: { name: string, args: unknown } }
    | { type: 'tool_result', data: { name: string, result: unknown } }
    | { type: 'usage', data: UsageInfo }
    | { type: 'error', data: Error }
    | { type: 'done', data: null }

export interface StreamResult<T> {
  readonly value: Promise<T>
  readonly stream: AsyncIterable<StreamPart>
  toResponse: () => Response
  toSSEResponse: () => Response
  consumeStream: () => Promise<void>
}

export interface StreamResultOptions<T> {
  stream: AsyncIterable<StreamPart>
  getValue: () => Promise<T>
}

export function createStreamResult<T>(options: StreamResultOptions<T>): StreamResult<T> {
  const { stream, getValue } = options
  let consumed = false
  const parts: StreamPart[] = []

  async function* wrapStream(): AsyncIterable<StreamPart> {
    for await (const part of stream) {
      parts.push(part)
      yield part
    }
    consumed = true
  }

  const wrappedStream = wrapStream()

  return {
    get value() {
      return getValue()
    },

    get stream() {
      return wrappedStream
    },

    toResponse(): Response {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          for await (const part of wrappedStream) {
            if (part.type === 'text')
              controller.enqueue(encoder.encode(part.data))
          }
          controller.close()
        },
      })
      return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    },

    toSSEResponse(): Response {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          for await (const part of wrappedStream) {
            const data = part.type === 'error' ? { type: part.type, data: { message: part.data.message } } : part
            controller.enqueue(encoder.encode(formatSSE(part.type, data)))
          }
          controller.close()
        },
      })
      return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
    },

    async consumeStream(): Promise<void> {
      if (consumed)
        return
      for await (const _part of wrappedStream)
        void _part
    },
  }
}

export function formatSSE(event: string, data: unknown): string {
  const json = JSON.stringify(data)
  return `event: ${event}\ndata: ${json}\n\n`
}

export function parseSSE(line: string): { event?: string, data?: string } | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(':'))
    return null

  if (trimmed.startsWith('event:'))
    return { event: trimmed.slice(6).trim() }

  if (trimmed.startsWith('data:'))
    return { data: trimmed.slice(5).trim() }

  return null
}

export class SSEParser {
  private currentEvent: string | undefined
  private dataBuffer: string[] = []

  parse(chunk: string): Array<{ event?: string, data: unknown }> {
    const results: Array<{ event?: string, data: unknown }> = []
    const lines = chunk.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed) {
        if (this.dataBuffer.length > 0) {
          const dataStr = this.dataBuffer.join('\n')
          try {
            results.push({ event: this.currentEvent, data: JSON.parse(dataStr) })
          }
          catch {
            results.push({ event: this.currentEvent, data: dataStr })
          }
          this.currentEvent = undefined
          this.dataBuffer = []
        }
        continue
      }

      if (trimmed.startsWith(':'))
        continue

      if (trimmed.startsWith('event:')) {
        this.currentEvent = trimmed.slice(6).trim()
      }
      else if (trimmed.startsWith('data:')) {
        this.dataBuffer.push(trimmed.slice(5).trim())
      }
    }

    return results
  }
}

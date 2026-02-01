import type { StreamPart } from '../src/stream'
import { describe, expect, it } from 'vitest'
import { createStreamResult, formatSSE, parseSSE, SSEParser } from '../src/stream'

describe('stream', () => {
  describe('createStreamResult', () => {
    it('iterates stream parts', async () => {
      const parts: StreamPart[] = [
        { type: 'text', data: 'hello' },
        { type: 'text', data: ' world' },
        { type: 'done', data: null },
      ]

      async function* gen(): AsyncIterable<StreamPart> {
        for (const part of parts)
          yield part
      }

      const result = createStreamResult({ stream: gen(), getValue: async () => 'hello world' })

      const collected: StreamPart[] = []
      for await (const part of result.stream)
        collected.push(part)

      expect(collected).toEqual(parts)
    })

    it('resolves value', async () => {
      async function* gen(): AsyncIterable<StreamPart> {
        yield { type: 'text', data: 'test' }
      }

      const result = createStreamResult({ stream: gen(), getValue: async () => 'final-value' })

      expect(await result.value).toBe('final-value')
    })

    it('creates text response', async () => {
      async function* gen(): AsyncIterable<StreamPart> {
        yield { type: 'text', data: 'hello' }
        yield { type: 'text', data: ' world' }
      }

      const result = createStreamResult({ stream: gen(), getValue: async () => '' })
      const response = result.toResponse()

      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
      const text = await response.text()
      expect(text).toBe('hello world')
    })

    it('creates SSE response', async () => {
      async function* gen(): AsyncIterable<StreamPart> {
        yield { type: 'text', data: 'hello' }
      }

      const result = createStreamResult({ stream: gen(), getValue: async () => '' })
      const response = result.toSSEResponse()

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('consumes stream', async () => {
      let consumed = false
      async function* gen(): AsyncIterable<StreamPart> {
        yield { type: 'text', data: 'test' }
        consumed = true
      }

      const result = createStreamResult({ stream: gen(), getValue: async () => '' })
      await result.consumeStream()

      expect(consumed).toBe(true)
    })
  })

  describe('formatSSE', () => {
    it('formats event with JSON data', () => {
      const sse = formatSSE('text', { type: 'text', data: 'hello' })
      expect(sse).toBe('event: text\ndata: {"type":"text","data":"hello"}\n\n')
    })
  })

  describe('parseSSE', () => {
    it('parses event line', () => {
      const result = parseSSE('event: text')
      expect(result).toEqual({ event: 'text' })
    })

    it('parses data line', () => {
      const result = parseSSE('data: {"test": true}')
      expect(result).toEqual({ data: '{"test": true}' })
    })

    it('returns null for empty line', () => {
      expect(parseSSE('')).toBeNull()
    })

    it('returns null for comment', () => {
      expect(parseSSE(': comment')).toBeNull()
    })

    it('returns null for unknown line', () => {
      expect(parseSSE('unknown: value')).toBeNull()
    })
  })

  describe('sSEParser', () => {
    it('parses complete events', () => {
      const parser = new SSEParser()
      const events = parser.parse('event: text\ndata: {"msg":"hello"}\n\n')

      expect(events).toHaveLength(1)
      expect(events[0].event).toBe('text')
      expect(events[0].data).toEqual({ msg: 'hello' })
    })

    it('handles multiple events', () => {
      const parser = new SSEParser()
      const events = parser.parse('event: a\ndata: "1"\n\nevent: b\ndata: "2"\n\n')

      expect(events).toHaveLength(2)
      expect(events[0].event).toBe('a')
      expect(events[1].event).toBe('b')
    })

    it('handles non-JSON data', () => {
      const parser = new SSEParser()
      const events = parser.parse('data: plain text\n\n')

      expect(events).toHaveLength(1)
      expect(events[0].data).toBe('plain text')
    })
  })
})

import { describe, expect, it } from 'vitest'
import { buildContext, estimateTokens, splitByTokens, truncateToFit } from '../src/context'

describe('context/estimateTokens', () => {
  it('estimates tokens with default ratio', () => {
    const text = 'a'.repeat(40) // 40 chars = 10 tokens at 4 chars/token
    expect(estimateTokens(text)).toBe(10)
  })

  it('rounds up partial tokens', () => {
    const text = 'a'.repeat(5) // 5 chars = 1.25 tokens → 2
    expect(estimateTokens(text)).toBe(2)
  })

  it('respects custom charsPerToken', () => {
    const text = 'a'.repeat(30)
    expect(estimateTokens(text, { charsPerToken: 3 })).toBe(10)
  })

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })
})

describe('context/truncateToFit', () => {
  it('returns content unchanged if within limit', () => {
    const content = 'short text'
    const result = truncateToFit(content, { maxTokens: 100 })
    expect(result).toBe(content)
  })

  it('truncates and adds suffix', () => {
    const content = 'a'.repeat(100)
    const result = truncateToFit(content, { maxTokens: 10 }) // 40 chars max
    expect(result.length).toBeLessThanOrEqual(40)
    expect(result).toContain('[truncated]')
  })

  it('uses custom suffix', () => {
    const content = 'a'.repeat(100)
    const result = truncateToFit(content, { maxTokens: 10, suffix: '...' })
    expect(result.endsWith('...')).toBe(true)
  })

  it('handles suffix longer than allowed space', () => {
    const content = 'a'.repeat(100)
    const result = truncateToFit(content, { maxTokens: 2, suffix: 'very long suffix' })
    expect(result.length).toBeLessThanOrEqual(8)
  })
})

describe('context/buildContext', () => {
  it('includes all items within budget', () => {
    const items = [
      { content: 'a'.repeat(10), id: 'a' },
      { content: 'b'.repeat(10), id: 'b' },
    ]
    const result = buildContext(items, { maxTokens: 100 })

    expect(result.included).toContain('a')
    expect(result.included).toContain('b')
    expect(result.excluded).toHaveLength(0)
  })

  it('excludes items that exceed budget', () => {
    const items = [
      { content: 'a'.repeat(40), id: 'a' }, // 10 tokens
      { content: 'b'.repeat(40), id: 'b' }, // 10 tokens
    ]
    const result = buildContext(items, { maxTokens: 12 }) // 48 chars

    expect(result.included).toHaveLength(1)
    expect(result.excluded).toHaveLength(1)
  })

  it('prioritizes higher priority items', () => {
    const items = [
      { content: 'low', id: 'low', priority: 1 },
      { content: 'high', id: 'high', priority: 10 },
    ]
    const result = buildContext(items, { maxTokens: 2 })

    expect(result.included[0]).toBe('high')
  })

  it('uses custom separator', () => {
    const items = [
      { content: 'a', id: 'a' },
      { content: 'b', id: 'b' },
    ]
    const result = buildContext(items, { maxTokens: 100, separator: '---' })

    expect(result.content).toBe('a---b')
  })

  it('assigns default ids to items without id', () => {
    const items = [{ content: 'test' }]
    const result = buildContext(items, { maxTokens: 100 })

    expect(result.included[0]).toBe('item-0')
  })

  it('returns correct token estimate', () => {
    const items = [{ content: 'a'.repeat(40), id: 'a' }]
    const result = buildContext(items, { maxTokens: 100 })

    expect(result.tokens).toBe(10)
  })
})

describe('context/splitByTokens', () => {
  it('returns single chunk for small text', () => {
    const text = 'small text'
    const chunks = splitByTokens(text, 100)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(text)
  })

  it('splits large text into chunks', () => {
    const text = 'a'.repeat(100)
    const chunks = splitByTokens(text, 10) // 40 chars per chunk
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('prefers splitting at newlines', () => {
    const text = 'line1\nline2\nline3\nline4'
    const chunks = splitByTokens(text, 3) // 12 chars per chunk
    expect(chunks[0]).toContain('\n')
  })

  it('handles text without newlines', () => {
    const text = 'a'.repeat(100)
    const chunks = splitByTokens(text, 10)
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(40)
    })
  })

  it('respects custom charsPerToken', () => {
    const text = 'a'.repeat(100)
    const chunks = splitByTokens(text, 10, { charsPerToken: 2 }) // 20 chars per chunk
    expect(chunks.length).toBe(5)
  })
})

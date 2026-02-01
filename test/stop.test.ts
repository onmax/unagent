import { describe, expect, it } from 'vitest'
import { and, costIs, iterationCountIs, not, or, timeout, tokenCountIs } from '../src/stop'

describe('stop', () => {
  describe('iterationCountIs', () => {
    it('returns true when iteration equals max', () => {
      const stop = iterationCountIs(5)
      expect(stop({ iteration: 5 })).toBe(true)
    })

    it('returns true when iteration exceeds max', () => {
      const stop = iterationCountIs(5)
      expect(stop({ iteration: 6 })).toBe(true)
    })

    it('returns false when iteration is below max', () => {
      const stop = iterationCountIs(5)
      expect(stop({ iteration: 4 })).toBe(false)
    })
  })

  describe('tokenCountIs', () => {
    it('returns true when total tokens reach max', () => {
      const stop = tokenCountIs(1000)
      expect(stop({ usage: { inputTokens: 600, outputTokens: 400 } })).toBe(true)
    })

    it('returns false when no usage', () => {
      const stop = tokenCountIs(1000)
      expect(stop({})).toBe(false)
    })
  })

  describe('costIs', () => {
    it('returns true when cost reaches max', () => {
      const rates = { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15 }
      const stop = costIs(1, rates)
      // 1M input = $3, 50k output = $0.75 → total $3.75 > $1
      expect(stop({ usage: { inputTokens: 1_000_000, outputTokens: 50_000 } })).toBe(true)
    })

    it('returns false when no usage', () => {
      const rates = { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15 }
      const stop = costIs(1, rates)
      expect(stop({})).toBe(false)
    })
  })

  describe('timeout', () => {
    it('returns true when time exceeded', () => {
      const stop = timeout(1000)
      expect(stop({ startTime: Date.now() - 1500 })).toBe(true)
    })

    it('returns false when within time', () => {
      const stop = timeout(1000)
      expect(stop({ startTime: Date.now() - 500 })).toBe(false)
    })
  })

  describe('combinators', () => {
    it('and returns true when all conditions met', async () => {
      const stop = and(iterationCountIs(5), tokenCountIs(100))
      expect(await stop({ iteration: 5, usage: { inputTokens: 100, outputTokens: 100 } })).toBe(true)
    })

    it('and returns false when any condition not met', async () => {
      const stop = and(iterationCountIs(5), tokenCountIs(100))
      expect(await stop({ iteration: 3, usage: { inputTokens: 100, outputTokens: 100 } })).toBe(false)
    })

    it('or returns true when any condition met', async () => {
      const stop = or(iterationCountIs(5), tokenCountIs(100))
      expect(await stop({ iteration: 5, usage: { inputTokens: 50, outputTokens: 0 } })).toBe(true)
    })

    it('or returns false when no conditions met', async () => {
      const stop = or(iterationCountIs(5), tokenCountIs(100))
      expect(await stop({ iteration: 3, usage: { inputTokens: 50, outputTokens: 0 } })).toBe(false)
    })

    it('not inverts condition', async () => {
      const stop = not(iterationCountIs(5))
      expect(await stop({ iteration: 5 })).toBe(false)
      expect(await stop({ iteration: 3 })).toBe(true)
    })
  })
})

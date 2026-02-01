import { describe, expect, it } from 'vitest'
import { aggregateUsage, calculateCost, getRatesForModel, MODEL_PRICING } from '../src/usage'

describe('usage', () => {
  describe('calculateCost', () => {
    it('calculates basic input/output costs', () => {
      const usage = { inputTokens: 1_000_000, outputTokens: 500_000 }
      const rates = { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15 }
      expect(calculateCost(usage, rates)).toBe(10.5) // 3 + 7.5
    })

    it('includes cache costs when provided', () => {
      const usage = { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 100_000, cacheWriteTokens: 50_000 }
      const rates = { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15, cacheReadCostPerMillionTokens: 0.3, cacheWriteCostPerMillionTokens: 3.75 }
      const cost = calculateCost(usage, rates)
      expect(cost).toBeCloseTo(10.5 + 0.03 + 0.1875)
    })

    it('handles zero tokens', () => {
      const usage = { inputTokens: 0, outputTokens: 0 }
      const rates = { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15 }
      expect(calculateCost(usage, rates)).toBe(0)
    })
  })

  describe('aggregateUsage', () => {
    it('sums token counts', () => {
      const u1 = { inputTokens: 100, outputTokens: 50 }
      const u2 = { inputTokens: 200, outputTokens: 100 }
      const result = aggregateUsage(u1, u2)
      expect(result.inputTokens).toBe(300)
      expect(result.outputTokens).toBe(150)
    })

    it('handles cache tokens', () => {
      const u1 = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10 }
      const u2 = { inputTokens: 200, outputTokens: 100, cacheWriteTokens: 20 }
      const result = aggregateUsage(u1, u2)
      expect(result.cacheReadTokens).toBe(10)
      expect(result.cacheWriteTokens).toBe(20)
    })

    it('handles empty array', () => {
      const result = aggregateUsage()
      expect(result.inputTokens).toBe(0)
      expect(result.outputTokens).toBe(0)
    })
  })

  describe('getRatesForModel', () => {
    it('returns exact match', () => {
      const rates = getRatesForModel('gpt-4o')
      expect(rates).toBeDefined()
      expect(rates!.inputCostPerMillionTokens).toBe(2.5)
    })

    it('returns fuzzy match', () => {
      const rates = getRatesForModel('claude-3-5-sonnet-20241022-v2')
      expect(rates).toBeDefined()
    })

    it('returns undefined for unknown model', () => {
      expect(getRatesForModel('unknown-model-xyz')).toBeUndefined()
    })
  })

  describe('mODEL_PRICING', () => {
    it('has Claude models', () => {
      expect(MODEL_PRICING['claude-opus-4-20250514']).toBeDefined()
      expect(MODEL_PRICING['claude-sonnet-4-20250514']).toBeDefined()
    })

    it('has GPT models', () => {
      expect(MODEL_PRICING['gpt-4o']).toBeDefined()
      expect(MODEL_PRICING['gpt-4o-mini']).toBeDefined()
    })

    it('has Gemini models', () => {
      expect(MODEL_PRICING['gemini-2.0-flash']).toBeDefined()
    })
  })
})

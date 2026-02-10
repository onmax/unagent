import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('pricing sync', () => {
  it('parses models from JSON and builds pricing', async () => {
    const json = JSON.parse(readFileSync(resolve(process.cwd(), 'test/fixtures/vercel-ai-gateway-models.json'), 'utf8'))
    const mod = await import('../scripts/sync-ai-gateway-pricing.mjs')

    const models = mod.parseModelsFromJson(json)
    const pricing = mod.buildPricing(models)

    expect(pricing.get('gpt-4o')).toEqual({
      inputCostPerMillionTokens: 2.5,
      outputCostPerMillionTokens: 10,
      cacheReadCostPerMillionTokens: undefined,
      cacheWriteCostPerMillionTokens: undefined,
    })

    expect(pricing.get('openai/gpt-4o-mini')).toEqual({
      inputCostPerMillionTokens: 0.15,
      outputCostPerMillionTokens: 0.6,
      cacheReadCostPerMillionTokens: 0.075,
      cacheWriteCostPerMillionTokens: undefined,
    })

    expect(pricing.get('amazon/titan-embed-text-v2')).toEqual({
      inputCostPerMillionTokens: 0.02,
      outputCostPerMillionTokens: 0,
      cacheReadCostPerMillionTokens: undefined,
      cacheWriteCostPerMillionTokens: undefined,
    })
  })
})

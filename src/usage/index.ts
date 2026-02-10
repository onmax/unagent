import type { CostRates, UsageInfo } from './types'
import { MODEL_PRICING_GENERATED } from './model-pricing.generated'
import { MODEL_PRICING_MANUAL } from './model-pricing.manual'

export type { CostRates, UsageInfo } from './types'

export function calculateCost(usage: UsageInfo, rates: CostRates): number {
  let cost = 0
  cost += (usage.inputTokens / 1_000_000) * rates.inputCostPerMillionTokens
  cost += (usage.outputTokens / 1_000_000) * rates.outputCostPerMillionTokens
  if (usage.cacheReadTokens && rates.cacheReadCostPerMillionTokens)
    cost += (usage.cacheReadTokens / 1_000_000) * rates.cacheReadCostPerMillionTokens
  if (usage.cacheWriteTokens && rates.cacheWriteCostPerMillionTokens)
    cost += (usage.cacheWriteTokens / 1_000_000) * rates.cacheWriteCostPerMillionTokens
  return cost
}

export function aggregateUsage(...usages: UsageInfo[]): UsageInfo {
  const result = usages.reduce((acc, usage) => ({
    inputTokens: acc.inputTokens + usage.inputTokens,
    outputTokens: acc.outputTokens + usage.outputTokens,
    cacheReadTokens: (acc.cacheReadTokens ?? 0) + (usage.cacheReadTokens ?? 0),
    cacheWriteTokens: (acc.cacheWriteTokens ?? 0) + (usage.cacheWriteTokens ?? 0),
  }), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })

  // Only include cache fields if any usage had them
  const hasCacheRead = usages.some(u => u.cacheReadTokens !== undefined)
  const hasCacheWrite = usages.some(u => u.cacheWriteTokens !== undefined)

  return {
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    ...(hasCacheRead && { cacheReadTokens: result.cacheReadTokens }),
    ...(hasCacheWrite && { cacheWriteTokens: result.cacheWriteTokens }),
  }
}

export const MODEL_PRICING: Record<string, CostRates> = {
  ...MODEL_PRICING_MANUAL,
  ...MODEL_PRICING_GENERATED,
}

export function getRatesForModel(modelId: string): CostRates | undefined {
  if (MODEL_PRICING[modelId])
    return MODEL_PRICING[modelId]

  // fuzzy match: choose the most specific (longest) match to avoid short keys shadowing.
  let bestKey: string | undefined
  let bestRates: CostRates | undefined
  for (const [key, rates] of Object.entries(MODEL_PRICING)) {
    if (modelId.includes(key) || key.includes(modelId)) {
      if (!bestKey || key.length > bestKey.length) {
        bestKey = key
        bestRates = rates
      }
    }
  }

  return bestRates
}

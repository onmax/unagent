export interface UsageInfo {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export interface CostRates {
  inputCostPerMillionTokens: number
  outputCostPerMillionTokens: number
  cacheReadCostPerMillionTokens?: number
  cacheWriteCostPerMillionTokens?: number
}

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
  // Claude
  'claude-opus-4-20250514': { inputCostPerMillionTokens: 15, outputCostPerMillionTokens: 75, cacheReadCostPerMillionTokens: 1.5, cacheWriteCostPerMillionTokens: 18.75 },
  'claude-sonnet-4-20250514': { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15, cacheReadCostPerMillionTokens: 0.3, cacheWriteCostPerMillionTokens: 3.75 },
  'claude-3-7-sonnet-20250219': { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15, cacheReadCostPerMillionTokens: 0.3, cacheWriteCostPerMillionTokens: 3.75 },
  'claude-3-5-sonnet-20241022': { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15, cacheReadCostPerMillionTokens: 0.3, cacheWriteCostPerMillionTokens: 3.75 },
  'claude-3-5-haiku-20241022': { inputCostPerMillionTokens: 0.8, outputCostPerMillionTokens: 4, cacheReadCostPerMillionTokens: 0.08, cacheWriteCostPerMillionTokens: 1 },
  'claude-3-opus-20240229': { inputCostPerMillionTokens: 15, outputCostPerMillionTokens: 75, cacheReadCostPerMillionTokens: 1.5, cacheWriteCostPerMillionTokens: 18.75 },
  'claude-3-haiku-20240307': { inputCostPerMillionTokens: 0.25, outputCostPerMillionTokens: 1.25, cacheReadCostPerMillionTokens: 0.03, cacheWriteCostPerMillionTokens: 0.3 },
  // GPT
  'gpt-4o': { inputCostPerMillionTokens: 2.5, outputCostPerMillionTokens: 10 },
  'gpt-4o-mini': { inputCostPerMillionTokens: 0.15, outputCostPerMillionTokens: 0.6 },
  'gpt-4-turbo': { inputCostPerMillionTokens: 10, outputCostPerMillionTokens: 30 },
  'gpt-4': { inputCostPerMillionTokens: 30, outputCostPerMillionTokens: 60 },
  'gpt-3.5-turbo': { inputCostPerMillionTokens: 0.5, outputCostPerMillionTokens: 1.5 },
  'o1': { inputCostPerMillionTokens: 15, outputCostPerMillionTokens: 60 },
  'o1-mini': { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 12 },
  'o3-mini': { inputCostPerMillionTokens: 1.1, outputCostPerMillionTokens: 4.4 },
  // Gemini
  'gemini-2.0-flash': { inputCostPerMillionTokens: 0.1, outputCostPerMillionTokens: 0.4 },
  'gemini-1.5-pro': { inputCostPerMillionTokens: 1.25, outputCostPerMillionTokens: 5 },
  'gemini-1.5-flash': { inputCostPerMillionTokens: 0.075, outputCostPerMillionTokens: 0.3 },
  // Mistral
  'mistral-large': { inputCostPerMillionTokens: 2, outputCostPerMillionTokens: 6 },
  'mistral-small': { inputCostPerMillionTokens: 0.2, outputCostPerMillionTokens: 0.6 },
  'codestral': { inputCostPerMillionTokens: 0.3, outputCostPerMillionTokens: 0.9 },
  // Cohere
  'command-r-plus': { inputCostPerMillionTokens: 2.5, outputCostPerMillionTokens: 10 },
  'command-r': { inputCostPerMillionTokens: 0.15, outputCostPerMillionTokens: 0.6 },
  // Llama (via providers)
  'llama-3.1-405b': { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 3 },
  'llama-3.1-70b': { inputCostPerMillionTokens: 0.88, outputCostPerMillionTokens: 0.88 },
  'llama-3.1-8b': { inputCostPerMillionTokens: 0.055, outputCostPerMillionTokens: 0.055 },
  // DeepSeek
  'deepseek-chat': { inputCostPerMillionTokens: 0.14, outputCostPerMillionTokens: 0.28 },
  'deepseek-reasoner': { inputCostPerMillionTokens: 0.55, outputCostPerMillionTokens: 2.19 },
}

export function getRatesForModel(modelId: string): CostRates | undefined {
  if (MODEL_PRICING[modelId])
    return MODEL_PRICING[modelId]

  // fuzzy match: check if any key is contained in modelId
  for (const [key, rates] of Object.entries(MODEL_PRICING)) {
    if (modelId.includes(key) || key.includes(modelId))
      return rates
  }

  return undefined
}

import type { CostRates } from './types'

// Curated baseline pricing (cost per 1M tokens).
// This is merged with the generated pricing table.
export const MODEL_PRICING_MANUAL: Record<string, CostRates> = {
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

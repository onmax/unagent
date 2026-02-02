---
icon: i-lucide-calculator
---

# usage

Token usage tracking and cost calculation. Includes pricing data for major model providers.

```ts
import { aggregateUsage, calculateCost, getRatesForModel, MODEL_PRICING } from 'unagent/usage'
```

## calculateCost

Calculates dollar cost from token usage and rates.

```ts
const usage = { inputTokens: 10_000, outputTokens: 2_000 }
const rates = MODEL_PRICING['claude-3-5-sonnet-20241022']

calculateCost(usage, rates) // 0.06 ($0.03 input + $0.03 output)
```

## aggregateUsage

Combines multiple usage records.

```ts
const total = aggregateUsage(
  { inputTokens: 1000, outputTokens: 500 },
  { inputTokens: 2000, outputTokens: 1000, cacheReadTokens: 500 },
)
// { inputTokens: 3000, outputTokens: 1500, cacheReadTokens: 500 }
```

## getRatesForModel

Looks up pricing by model ID with fuzzy matching.

```ts
getRatesForModel('claude-3-5-sonnet-20241022') // Exact match
getRatesForModel('gpt-4o-2024-05-13') // Fuzzy: matches 'gpt-4o'
getRatesForModel('unknown-model') // undefined
```

## MODEL_PRICING

Built-in pricing for major models (costs per million tokens).

```ts
MODEL_PRICING['claude-3-5-sonnet-20241022']
// { inputCostPerMillionTokens: 3, outputCostPerMillionTokens: 15, cacheReadCostPerMillionTokens: 0.3, cacheWriteCostPerMillionTokens: 3.75 }

MODEL_PRICING['gpt-4o']
// { inputCostPerMillionTokens: 2.5, outputCostPerMillionTokens: 10 }
```

Supported providers: Claude, GPT, Gemini, Mistral, Cohere, Llama, DeepSeek.

## Types

```ts
interface UsageInfo {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

interface CostRates {
  inputCostPerMillionTokens: number
  outputCostPerMillionTokens: number
  cacheReadCostPerMillionTokens?: number
  cacheWriteCostPerMillionTokens?: number
}
```

## Example: Budget Tracking

```ts
import { aggregateUsage, calculateCost, getRatesForModel } from 'unagent/usage'

const model = 'claude-3-5-sonnet-20241022'
const rates = getRatesForModel(model)!
const usages: UsageInfo[] = []

// After each LLM call
usages.push(response.usage)

// Check budget
const total = aggregateUsage(...usages)
const spent = calculateCost(total, rates)

if (spent > 10.00) {
  console.warn(`Budget exceeded: $${spent.toFixed(2)}`)
}
```

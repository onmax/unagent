import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_URL = 'https://ai-gateway.vercel.sh/v1/models'
const DEFAULT_OUT = resolve(process.cwd(), 'src/usage/model-pricing.generated.ts')

function toNumber(v) {
  if (v == null)
    return undefined

  if (typeof v === 'number') {
    if (!Number.isFinite(v))
      return undefined
    return v
  }

  if (typeof v !== 'string')
    return undefined

  const s = v.trim()
  if (!s || s === '$undefined')
    return undefined

  const n = Number(s)
  if (!Number.isFinite(n))
    return undefined
  return n
}

export function parseModelsFromJson(json) {
  if (json == null || typeof json !== 'object')
    throw new Error('Invalid JSON payload')

  const data = json.data
  if (!Array.isArray(data))
    throw new Error('JSON payload missing `data` array')

  return data
}

export function buildPricing(models) {
  // Stable ordering so slug collisions resolve deterministically.
  const sorted = [...models].sort((a, b) => String(a?.id ?? '').localeCompare(String(b?.id ?? '')))

  const out = new Map()

  for (const model of sorted) {
    const id = model?.id
    const pricing = model?.pricing

    const input = toNumber(pricing?.input)
    const output = toNumber(pricing?.output) ?? 0

    if (!id || input == null)
      continue

    const rates = {
      inputCostPerMillionTokens: input * 1_000_000,
      outputCostPerMillionTokens: output * 1_000_000,
      cacheReadCostPerMillionTokens: toNumber(pricing?.input_cache_read) != null ? toNumber(pricing?.input_cache_read) * 1_000_000 : undefined,
      cacheWriteCostPerMillionTokens: toNumber(pricing?.input_cache_write) != null ? toNumber(pricing?.input_cache_write) * 1_000_000 : undefined,
    }

    out.set(id, rates)
  }

  return out
}

export function generateTs(pricingMap) {
  const keys = Array.from(pricingMap.keys()).sort((a, b) => a.localeCompare(b))

  const quote = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`

  const lines = []
  lines.push('import type { CostRates } from \'./types\'')
  lines.push('')
  lines.push('// Generated from https://ai-gateway.vercel.sh/v1/models')
  lines.push('// Source page: https://vercel.com/ai-gateway/models')
  lines.push('// Run: pnpm pricing:sync')
  lines.push('export const MODEL_PRICING_GENERATED: Record<string, CostRates> = {')

  for (const key of keys) {
    const v = pricingMap.get(key)
    if (!v)
      continue

    const parts = [
      `inputCostPerMillionTokens: ${v.inputCostPerMillionTokens}`,
      `outputCostPerMillionTokens: ${v.outputCostPerMillionTokens}`,
    ]

    if (v.cacheReadCostPerMillionTokens != null)
      parts.push(`cacheReadCostPerMillionTokens: ${v.cacheReadCostPerMillionTokens}`)
    if (v.cacheWriteCostPerMillionTokens != null)
      parts.push(`cacheWriteCostPerMillionTokens: ${v.cacheWriteCostPerMillionTokens}`)

    lines.push(`  ${quote(key)}: { ${parts.join(', ')} },`)
  }

  lines.push('}')
  lines.push('')
  return `${lines.join('\n')}`
}

async function main() {
  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const jsonIdx = args.indexOf('--json')

  const outFile = outIdx !== -1 ? resolve(process.cwd(), args[outIdx + 1]) : DEFAULT_OUT
  const url = process.env.AI_GATEWAY_MODELS_URL || DEFAULT_URL

  let json
  if (jsonIdx !== -1) {
    const p = resolve(process.cwd(), args[jsonIdx + 1])
    json = JSON.parse(await readFile(p, 'utf8'))
  }
  else {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'unagent-pricing-sync',
        'accept': 'application/json',
      },
    })
    if (!res.ok)
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
    json = await res.json()
  }

  const models = parseModelsFromJson(json)
  const pricing = buildPricing(models)
  const ts = generateTs(pricing)

  await writeFile(outFile, ts, 'utf8')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

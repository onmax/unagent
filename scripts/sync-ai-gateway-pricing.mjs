import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_URL = 'https://vercel.com/ai-gateway/models'
const DEFAULT_OUT = resolve(process.cwd(), 'src/usage/model-pricing.generated.ts')

function countBackslashesBefore(s, i) {
  let n = 0
  for (let j = i - 1; j >= 0 && s[j] === '\\\\'; j--)
    n++
  return n
}

export function extractEscapedModelsArray(html) {
  const startToken = '[{\\\"slug\\\":\\\"'
  const start = html.indexOf(startToken)
  if (start === -1)
    throw new Error('Could not find escaped models array start token')

  let depth = 0
  let inString = false

  for (let i = start; i < html.length; i++) {
    const ch = html[i]

    if (ch === '\"') {
      const bs = countBackslashesBefore(html, i)
      if (bs > 0) {
        // One backslash is for the outer string escaping this quote. The rest
        // determines whether the quote is escaped at the inner JSON level.
        const innerBackslashes = bs - 1
        if (innerBackslashes % 2 === 0)
          inString = !inString
      }
      continue
    }

    if (inString)
      continue

    if (ch === '[') {
      depth++
    }
    else if (ch === ']') {
      depth--
      if (depth === 0)
        return html.slice(start, i + 1)
      if (depth < 0)
        break
    }
  }

  throw new Error('Could not extract escaped models array (unbalanced brackets)')
}

export function parseModelsFromHtml(html) {
  const escaped = extractEscapedModelsArray(html)

  // Decode one layer of escaping (this array is embedded as a JSON string).
  const decodedJson = JSON.parse(`"${escaped}"`)
  const models = JSON.parse(decodedJson)

  if (!Array.isArray(models))
    throw new Error('Parsed models payload is not an array')

  return models
}

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

export function buildPricing(models) {
  // Stable ordering so slug collisions resolve deterministically.
  const sorted = [...models].sort((a, b) => {
    const ak = String(a?.copyString ?? a?.slug ?? '')
    const bk = String(b?.copyString ?? b?.slug ?? '')
    return ak.localeCompare(bk)
  })

  const out = new Map()

  for (const model of sorted) {
    const slug = model?.slug
    const copyString = model?.copyString

    const input = toNumber(model?.inputCost)
    const output = toNumber(model?.outputCost)

    if (!slug || input == null || output == null)
      continue

    const rates = {
      inputCostPerMillionTokens: input,
      outputCostPerMillionTokens: output,
      cacheReadCostPerMillionTokens: toNumber(model?.cachedInputCost),
      cacheWriteCostPerMillionTokens: toNumber(model?.cacheCreationInputCost),
    }

    if (copyString)
      out.set(copyString, rates)

    if (!out.has(slug))
      out.set(slug, rates)
  }

  return out
}

export function generateTs(pricingMap) {
  const keys = Array.from(pricingMap.keys()).sort((a, b) => a.localeCompare(b))

  const quote = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`

  const lines = []
  lines.push('import type { CostRates } from \'./types\'')
  lines.push('')
  lines.push('// Generated from https://vercel.com/ai-gateway/models')
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
  const htmlIdx = args.indexOf('--html')

  const outFile = outIdx !== -1 ? resolve(process.cwd(), args[outIdx + 1]) : DEFAULT_OUT
  const url = process.env.AI_GATEWAY_MODELS_URL || DEFAULT_URL

  let html
  if (htmlIdx !== -1) {
    const p = resolve(process.cwd(), args[htmlIdx + 1])
    html = await readFile(p, 'utf8')
  }
  else {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'unagent-pricing-sync',
        'accept': 'text/html',
      },
    })
    if (!res.ok)
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
    html = await res.text()
  }

  const models = parseModelsFromHtml(html)
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

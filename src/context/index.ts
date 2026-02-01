const CHARS_PER_TOKEN = 4

export interface TokenEstimateOptions {
  charsPerToken?: number
}

export function estimateTokens(text: string, options: TokenEstimateOptions = {}): number {
  const { charsPerToken = CHARS_PER_TOKEN } = options
  return Math.ceil(text.length / charsPerToken)
}

export interface TruncateOptions {
  maxTokens: number
  charsPerToken?: number
  suffix?: string
}

export function truncateToFit(content: string, options: TruncateOptions): string {
  const { maxTokens, charsPerToken = CHARS_PER_TOKEN, suffix = '\n...[truncated]' } = options
  const maxChars = maxTokens * charsPerToken

  if (content.length <= maxChars)
    return content

  const suffixChars = suffix.length
  const truncateAt = maxChars - suffixChars

  if (truncateAt <= 0)
    return suffix.slice(0, maxChars)

  return content.slice(0, truncateAt) + suffix
}

export interface ContextItem {
  content: string
  priority?: number
  id?: string
}

export interface BuildContextOptions {
  maxTokens: number
  charsPerToken?: number
  separator?: string
}

export interface BuildContextResult {
  content: string
  tokens: number
  included: string[]
  excluded: string[]
}

export function buildContext(items: ContextItem[], options: BuildContextOptions): BuildContextResult {
  const { maxTokens, charsPerToken = CHARS_PER_TOKEN, separator = '\n\n' } = options
  const maxChars = maxTokens * charsPerToken

  const sorted = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  const included: string[] = []
  const excluded: string[] = []
  const parts: string[] = []
  let currentChars = 0

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    const itemChars = item.content.length
    const separatorChars = parts.length > 0 ? separator.length : 0
    const totalChars = currentChars + itemChars + separatorChars

    if (totalChars <= maxChars) {
      parts.push(item.content)
      currentChars = totalChars
      included.push(item.id ?? `item-${i}`)
    }
    else {
      excluded.push(item.id ?? `item-${i}`)
    }
  }

  return {
    content: parts.join(separator),
    tokens: estimateTokens(parts.join(separator), { charsPerToken }),
    included,
    excluded,
  }
}

export function splitByTokens(text: string, maxTokensPerChunk: number, options: TokenEstimateOptions = {}): string[] {
  const { charsPerToken = CHARS_PER_TOKEN } = options
  const maxChars = maxTokensPerChunk * charsPerToken
  const chunks: string[] = []

  let start = 0
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)

    if (end < text.length) {
      const newlineIdx = text.lastIndexOf('\n', end)
      if (newlineIdx > start)
        end = newlineIdx + 1
    }

    chunks.push(text.slice(start, end))
    start = end
  }

  return chunks
}

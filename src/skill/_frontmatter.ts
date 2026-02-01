import { parse as parseYaml } from 'yaml'

export function parseFrontmatter<T = Record<string, unknown>>(input: string): { data: T, content: string } {
  const match = input.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match)
    return { data: {} as T, content: input.trim() }
  return {
    data: parseYaml(match[1]) as T,
    content: match[2].trim(),
  }
}

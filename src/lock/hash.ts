import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

export function computeFileHash(filePath: string): string | undefined {
  if (!existsSync(filePath))
    return undefined
  const content = readFileSync(filePath, 'utf-8')
  return computeContentHash(content)
}

export function computeDirectoryHash(dirPath: string, exclude: string[] = []): string | undefined {
  if (!existsSync(dirPath))
    return undefined

  const hash = createHash('sha256')
  hashDirectory(dirPath, hash, exclude)
  return hash.digest('hex').slice(0, 16)
}

function hashDirectory(dir: string, hash: ReturnType<typeof createHash>, exclude: string[]): void {
  const entries = readdirSync(dir).sort()

  for (const entry of entries) {
    if (exclude.includes(entry))
      continue

    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    hash.update(entry)

    if (stat.isDirectory()) {
      hash.update('dir')
      hashDirectory(fullPath, hash, exclude)
    }
    else {
      hash.update('file')
      const content = readFileSync(fullPath)
      hash.update(content)
    }
  }
}

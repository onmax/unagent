import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'pathe'

export interface CopyOptions {
  force?: boolean
  exclude?: string[]
  preserveTimestamps?: boolean
}

export interface CopyResult {
  success: boolean
  src: string
  dest: string
  filesCopied?: number
  error?: string
}

const DEFAULT_EXCLUDE = ['.git', 'node_modules', '.DS_Store', 'Thumbs.db']

export function copyDirectory(src: string, dest: string, options: CopyOptions = {}): CopyResult {
  const { force = false, exclude = DEFAULT_EXCLUDE, preserveTimestamps = true } = options

  if (!existsSync(src)) {
    return { success: false, src, dest, error: 'Source does not exist' }
  }

  const srcStat = statSync(src)
  if (!srcStat.isDirectory()) {
    return { success: false, src, dest, error: 'Source is not a directory' }
  }

  try {
    if (existsSync(dest)) {
      if (!force) {
        return { success: false, src, dest, error: 'Destination already exists' }
      }
      rmSync(dest, { recursive: true, force: true })
    }

    mkdirSync(dest, { recursive: true })

    const count = copyRecursive(src, dest, exclude, preserveTimestamps)
    return { success: true, src, dest, filesCopied: count }
  }
  catch (error) {
    return {
      success: false,
      src,
      dest,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function copyRecursive(src: string, dest: string, exclude: string[], preserveTimestamps: boolean): number {
  let count = 0
  const entries = readdirSync(src)

  for (const entry of entries) {
    if (exclude.includes(entry))
      continue

    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      mkdirSync(destPath, { recursive: true })
      count += copyRecursive(srcPath, destPath, exclude, preserveTimestamps)
    }
    else {
      cpSync(srcPath, destPath, { preserveTimestamps })
      count++
    }
  }

  return count
}

export function copyFile(src: string, dest: string, options: { force?: boolean } = {}): boolean {
  const { force = false } = options

  if (!existsSync(src))
    return false
  if (existsSync(dest) && !force)
    return false

  try {
    const destDir = join(dest, '..')
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }
    cpSync(src, dest)
    return true
  }
  catch {
    return false
  }
}

export function getDirectorySize(dir: string): number {
  if (!existsSync(dir))
    return 0

  let size = 0
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      size += getDirectorySize(fullPath)
    }
    else {
      size += stat.size
    }
  }

  return size
}

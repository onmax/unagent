import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { git } from './_exec'

export class GitCloneError extends Error {
  public readonly url: string
  public override readonly cause: Error | undefined

  constructor(message: string, url: string, cause?: Error) {
    super(message)
    this.name = 'GitCloneError'
    this.url = url
    this.cause = cause
  }
}

export interface CloneOptions {
  depth?: number
  branch?: string
  timeout?: number
  tempDir?: string
}

export interface CloneResult {
  success: boolean
  path: string
  error?: string
}

export function cloneRepo(url: string, dest: string, options: CloneOptions = {}): CloneResult {
  const { depth = 1, branch, timeout = 60000 } = options

  try {
    const args = ['clone']
    if (depth > 0)
      args.push('--depth', String(depth))
    if (branch)
      args.push('--branch', branch)
    args.push(url, dest)

    const destDir = join(dest, '..')
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    git(args, { timeout })
    return { success: true, path: dest }
  }
  catch (error) {
    return {
      success: false,
      path: dest,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function cloneToTemp(url: string, options: CloneOptions = {}): CloneResult {
  const { tempDir = tmpdir() } = options
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const dest = join(tempDir, `unagent-${timestamp}-${random}`)

  return cloneRepo(url, dest, options)
}

export function cleanupTempDir(path: string): boolean {
  const temp = tmpdir()
  if (!path.startsWith(temp))
    return false

  try {
    if (existsSync(path))
      rmSync(path, { recursive: true, force: true })
    return true
  }
  catch {
    return false
  }
}

export function isTempDir(path: string): boolean {
  return path.startsWith(tmpdir())
}

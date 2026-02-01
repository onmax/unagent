import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { simpleGit } from 'simple-git'

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

export async function cloneRepo(url: string, dest: string, options: CloneOptions = {}): Promise<CloneResult> {
  const { depth = 1, branch, timeout = 60000 } = options

  try {
    const git = simpleGit({ timeout: { block: timeout } })

    const cloneOptions: string[] = []
    if (depth > 0) {
      cloneOptions.push('--depth', String(depth))
    }
    if (branch) {
      cloneOptions.push('--branch', branch)
    }

    const destDir = join(dest, '..')
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    await git.clone(url, dest, cloneOptions)

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

export async function cloneToTemp(url: string, options: CloneOptions = {}): Promise<CloneResult> {
  const { tempDir = tmpdir() } = options
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const dest = join(tempDir, `unagent-${timestamp}-${random}`)

  return cloneRepo(url, dest, options)
}

export function cleanupTempDir(path: string): boolean {
  // Safety: only remove from temp directory
  const temp = tmpdir()
  if (!path.startsWith(temp))
    return false

  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true })
    }
    return true
  }
  catch {
    return false
  }
}

export function isTempDir(path: string): boolean {
  return path.startsWith(tmpdir())
}

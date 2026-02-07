import { existsSync } from 'node:fs'
import { git, parseGitStatus } from './_exec'

export interface GitStatus {
  isRepo: boolean
  branch: string
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  untracked: string[]
  hasChanges: boolean
}

export function getGitStatus(dir: string): GitStatus | undefined {
  if (!existsSync(dir))
    return undefined

  try {
    git(['rev-parse', '--is-inside-work-tree'], { cwd: dir })
    const output = git(['status', '--porcelain=v2', '--branch'], { cwd: dir })
    const parsed = parseGitStatus(output)

    return {
      isRepo: true,
      branch: parsed.branch,
      ahead: parsed.ahead,
      behind: parsed.behind,
      staged: parsed.staged,
      modified: parsed.modified,
      untracked: parsed.untracked,
      hasChanges: parsed.staged.length > 0 || parsed.modified.length > 0 || parsed.untracked.length > 0,
    }
  }
  catch {
    return undefined
  }
}

export function getCurrentBranch(dir: string): string | undefined {
  try {
    return git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir })
  }
  catch {
    return undefined
  }
}

export function checkout(dir: string, ref: string): boolean {
  try {
    git(['checkout', ref], { cwd: dir })
    return true
  }
  catch {
    return false
  }
}

export function pull(dir: string): boolean {
  try {
    git(['pull'], { cwd: dir })
    return true
  }
  catch {
    return false
  }
}

export function fetch(dir: string, remote: string = 'origin'): boolean {
  try {
    git(['fetch', remote], { cwd: dir })
    return true
  }
  catch {
    return false
  }
}

export function getRemoteUrl(dir: string, remote: string = 'origin'): string | undefined {
  try {
    return git(['remote', 'get-url', remote], { cwd: dir })
  }
  catch {
    return undefined
  }
}

export function getLatestCommitHash(dir: string): string | undefined {
  try {
    return git(['rev-parse', 'HEAD'], { cwd: dir })
  }
  catch {
    return undefined
  }
}

export function hasUncommittedChanges(dir: string): boolean {
  const status = getGitStatus(dir)
  return status?.hasChanges ?? false
}

import { existsSync } from 'node:fs'
import { simpleGit } from 'simple-git'

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

export async function getGitStatus(dir: string): Promise<GitStatus | undefined> {
  if (!existsSync(dir))
    return undefined

  try {
    const git = simpleGit(dir)
    const isRepo = await git.checkIsRepo()
    if (!isRepo)
      return undefined

    const status = await git.status()

    return {
      isRepo: true,
      branch: status.current || 'HEAD',
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged,
      modified: status.modified,
      untracked: status.not_added,
      hasChanges: !status.isClean(),
    }
  }
  catch {
    return undefined
  }
}

export async function getCurrentBranch(dir: string): Promise<string | undefined> {
  try {
    const git = simpleGit(dir)
    const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
    return branch.trim()
  }
  catch {
    return undefined
  }
}

export async function checkout(dir: string, ref: string): Promise<boolean> {
  try {
    const git = simpleGit(dir)
    await git.checkout(ref)
    return true
  }
  catch {
    return false
  }
}

export async function pull(dir: string): Promise<boolean> {
  try {
    const git = simpleGit(dir)
    await git.pull()
    return true
  }
  catch {
    return false
  }
}

export async function fetch(dir: string, remote: string = 'origin'): Promise<boolean> {
  try {
    const git = simpleGit(dir)
    await git.fetch(remote)
    return true
  }
  catch {
    return false
  }
}

export async function getRemoteUrl(dir: string, remote: string = 'origin'): Promise<string | undefined> {
  try {
    const git = simpleGit(dir)
    const remotes = await git.getRemotes(true)
    const found = remotes.find(r => r.name === remote)
    return found?.refs.fetch
  }
  catch {
    return undefined
  }
}

export async function getLatestCommitHash(dir: string): Promise<string | undefined> {
  try {
    const git = simpleGit(dir)
    const log = await git.log({ maxCount: 1 })
    return log.latest?.hash
  }
  catch {
    return undefined
  }
}

export async function hasUncommittedChanges(dir: string): Promise<boolean> {
  const status = await getGitStatus(dir)
  return status?.hasChanges ?? false
}

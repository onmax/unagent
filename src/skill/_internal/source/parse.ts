import type { SourceProvider } from './providers'
import { isAbsolute } from 'node:path'
import { parseGitHubUrl, parseGitLabUrl } from './providers'

export interface ParsedSource {
  type: SourceProvider
  raw: string
  owner?: string
  repo?: string
  path?: string
  ref?: string
  url?: string
  isLocal: boolean
}

export function isLocalPath(source: string): boolean {
  if (source.startsWith('/') || source.startsWith('./') || source.startsWith('../'))
    return true
  if (source.startsWith('~'))
    return true
  if (isAbsolute(source))
    return true
  if (/^[a-z]:[\\/]/i.test(source))
    return true
  return false
}

export function isUrl(source: string): boolean {
  return /^https?:\/\//.test(source) || /^(github|gitlab|bitbucket):/.test(source)
}

export function parseSource(source: string): ParsedSource {
  const trimmed = source.trim()

  if (isLocalPath(trimmed)) {
    return { type: 'local', raw: trimmed, isLocal: true }
  }

  if (trimmed.includes('github.com') || trimmed.startsWith('github:')) {
    const info = parseGitHubUrl(trimmed)
    if (info) {
      return {
        type: 'github',
        raw: trimmed,
        owner: info.owner,
        repo: info.repo,
        path: info.path,
        ref: info.ref,
        isLocal: false,
      }
    }
  }

  if (trimmed.includes('gitlab.com') || trimmed.startsWith('gitlab:')) {
    const info = parseGitLabUrl(trimmed)
    if (info) {
      return {
        type: 'gitlab',
        raw: trimmed,
        owner: info.owner,
        repo: info.repo,
        path: info.path,
        ref: info.ref,
        isLocal: false,
      }
    }
  }

  if (isUrl(trimmed)) {
    return { type: 'url', raw: trimmed, url: trimmed, isLocal: false }
  }

  // Assume owner/repo format for GitHub
  const ownerRepoMatch = trimmed.match(/^([^/]+)\/([^#@/]+)(?:\/([^#@]+))?(?:[#@](.+))?$/)
  if (ownerRepoMatch) {
    return {
      type: 'github',
      raw: trimmed,
      owner: ownerRepoMatch[1],
      repo: ownerRepoMatch[2],
      path: ownerRepoMatch[3],
      ref: ownerRepoMatch[4],
      isLocal: false,
    }
  }

  return { type: 'local', raw: trimmed, isLocal: true }
}

export function getOwnerRepo(parsed: ParsedSource): string | undefined {
  if (!parsed.owner || !parsed.repo)
    return undefined
  return `${parsed.owner}/${parsed.repo}`
}

export function parseOwnerRepo(ownerRepo: string): { owner: string, repo: string } | undefined {
  const match = ownerRepo.match(/^([^/]+)\/([^/]+)$/)
  if (!match)
    return undefined
  return { owner: match[1], repo: match[2] }
}

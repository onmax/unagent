export type SourceProvider = 'github' | 'gitlab' | 'bitbucket' | 'local' | 'url'

export interface ProviderInfo {
  provider: SourceProvider
  owner?: string
  repo?: string
  path?: string
  ref?: string
  url?: string
}

export function getProviderFromUrl(url: string): SourceProvider {
  if (url.includes('github.com') || url.includes('github:'))
    return 'github'
  if (url.includes('gitlab.com') || url.includes('gitlab:'))
    return 'gitlab'
  if (url.includes('bitbucket.org') || url.includes('bitbucket:'))
    return 'bitbucket'
  return 'url'
}

export function parseGitHubUrl(url: string): ProviderInfo | undefined {
  // github:owner/repo
  const shortMatch = url.match(/^github:([^/]+)\/([^#@/]+)(?:\/([^#@]+))?(?:[#@](.+))?$/)
  if (shortMatch) {
    return {
      provider: 'github',
      owner: shortMatch[1],
      repo: shortMatch[2],
      path: shortMatch[3],
      ref: shortMatch[4],
    }
  }

  // https://github.com/owner/repo/...
  const fullMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+)(?:\/(.+))?)?(?:[#@](.+))?$/)
  if (fullMatch) {
    return {
      provider: 'github',
      owner: fullMatch[1],
      repo: fullMatch[2],
      ref: fullMatch[3],
      path: fullMatch[4],
    }
  }

  return undefined
}

export function parseGitLabUrl(url: string): ProviderInfo | undefined {
  // gitlab:owner/repo
  const shortMatch = url.match(/^gitlab:([^/]+)\/([^#@/]+)(?:\/([^#@]+))?(?:[#@](.+))?$/)
  if (shortMatch) {
    return {
      provider: 'gitlab',
      owner: shortMatch[1],
      repo: shortMatch[2],
      path: shortMatch[3],
      ref: shortMatch[4],
    }
  }

  // https://gitlab.com/owner/repo/...
  const fullMatch = url.match(/gitlab\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/-\/tree\/([^/]+)(?:\/(.+))?)?(?:[#@](.+))?$/)
  if (fullMatch) {
    return {
      provider: 'gitlab',
      owner: fullMatch[1],
      repo: fullMatch[2],
      ref: fullMatch[3],
      path: fullMatch[4],
    }
  }

  return undefined
}

export function buildGitHubCloneUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}.git`
}

export function buildGitLabCloneUrl(owner: string, repo: string): string {
  return `https://gitlab.com/${owner}/${repo}.git`
}

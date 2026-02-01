---
icon: i-lucide-link
---

# source

Parse source strings into structured data. Supports GitHub, GitLab, URLs, and local paths.

```ts
import { parseSource, isLocalPath, isUrl } from 'unagents/source'
```

## Parsing

### `parseSource(source)`

Parse any source string into structured info.

```ts
// GitHub shorthand
parseSource('unjs/unagent')
// → { type: 'github', owner: 'unjs', repo: 'unagent', isLocal: false }

// GitHub with path and ref
parseSource('unjs/unagent/skills/commit#main')
// → { type: 'github', owner: 'unjs', repo: 'unagent', path: 'skills/commit', ref: 'main', isLocal: false }

// GitHub URL
parseSource('https://github.com/unjs/unagent/tree/main/src')
// → { type: 'github', owner: 'unjs', repo: 'unagent', ref: 'main', path: 'src', isLocal: false }

// GitHub prefix
parseSource('github:user/repo#v1.0')
// → { type: 'github', owner: 'user', repo: 'repo', ref: 'v1.0', isLocal: false }

// GitLab
parseSource('gitlab:group/project')
// → { type: 'gitlab', owner: 'group', repo: 'project', isLocal: false }

// Local path
parseSource('./my/local/path')
// → { type: 'local', raw: './my/local/path', isLocal: true }

// Generic URL
parseSource('https://example.com/skill.md')
// → { type: 'url', url: 'https://...', isLocal: false }
```

### `isLocalPath(source)`

Check if a source string is a local path.

```ts
isLocalPath('./src')           // true
isLocalPath('~/skills')        // true
isLocalPath('/absolute/path')  // true
isLocalPath('unjs/unagent')    // false
```

### `isUrl(source)`

Check if a source string is a URL.

```ts
isUrl('https://github.com/...')  // true
isUrl('github:user/repo')        // true
isUrl('./local')                 // false
```

## Helpers

### `getOwnerRepo(parsed)`

Get `owner/repo` string from parsed source.

```ts
const parsed = parseSource('github:unjs/unagent')
getOwnerRepo(parsed)  // "unjs/unagent"
```

### `parseOwnerRepo(ownerRepo)`

Parse `owner/repo` string.

```ts
parseOwnerRepo('unjs/unagent')
// → { owner: 'unjs', repo: 'unagent' }
```

## Providers

### `getProviderFromUrl(url)`

Detect provider from URL.

```ts
getProviderFromUrl('https://github.com/...')   // 'github'
getProviderFromUrl('https://gitlab.com/...')   // 'gitlab'
getProviderFromUrl('https://example.com/...')  // 'url'
```

### `parseGitHubUrl(url)`

Parse GitHub URL into components.

```ts
parseGitHubUrl('https://github.com/unjs/unagent/tree/main/src')
// → { provider: 'github', owner: 'unjs', repo: 'unagent', ref: 'main', path: 'src' }
```

### `parseGitLabUrl(url)`

Parse GitLab URL into components.

### `buildGitHubCloneUrl(owner, repo)`

Build clone URL for GitHub.

```ts
buildGitHubCloneUrl('unjs', 'unagent')
// → "https://github.com/unjs/unagent.git"
```

### `buildGitLabCloneUrl(owner, repo)`

Build clone URL for GitLab.

## Types

```ts
type SourceProvider = 'github' | 'gitlab' | 'bitbucket' | 'local' | 'url'

interface ParsedSource {
  type: SourceProvider
  raw: string
  owner?: string
  repo?: string
  path?: string
  ref?: string
  url?: string
  isLocal: boolean
}

interface ProviderInfo {
  provider: SourceProvider
  owner?: string
  repo?: string
  path?: string
  ref?: string
  url?: string
}
```

## Source Formats

| Format | Example | Result |
|--------|---------|--------|
| `owner/repo` | `unjs/unagent` | GitHub |
| `owner/repo/path` | `unjs/unagent/skills` | GitHub with path |
| `owner/repo#ref` | `unjs/unagent#v1` | GitHub with ref |
| `github:owner/repo` | `github:unjs/unagent` | GitHub explicit |
| `gitlab:owner/repo` | `gitlab:group/proj` | GitLab explicit |
| GitHub URL | `https://github.com/...` | GitHub |
| GitLab URL | `https://gitlab.com/...` | GitLab |
| Local path | `./path`, `~/path`, `/path` | Local |
| Other URL | `https://example.com/...` | URL |

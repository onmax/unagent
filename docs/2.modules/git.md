---
icon: i-lucide-git-branch
---

# git

Git operations for cloning repos and checking status.

```ts
import { cloneRepo, cloneToTemp, getGitStatus } from 'unagents/git'
```

## Cloning

### `cloneRepo(url, dest, options?)`

Clone a repository to a specific path.

```ts
const result = await cloneRepo('https://github.com/unjs/unagent.git', './unagent', {
  depth: 1,        // Shallow clone (default: 1)
  branch: 'main',  // Specific branch
  timeout: 60000,  // Timeout in ms (default: 60000)
})

if (result.success) {
  console.log(`Cloned to ${result.path}`)
} else {
  console.error(result.error)
}
```

### `cloneToTemp(url, options?)`

Clone to a temporary directory.

```ts
const result = await cloneToTemp('https://github.com/unjs/unagent.git')
// result.path → "/tmp/unagent-1234567890-abc123"
```

### `cleanupTempDir(path)`

Safely remove a temp directory. Only removes paths inside system temp dir.

```ts
cleanupTempDir(result.path)  // true if removed
```

### `isTempDir(path)`

Check if path is inside temp directory.

```ts
isTempDir('/tmp/unagent-123')  // true
isTempDir('/home/user/code')   // false
```

## Status

### `getGitStatus(dir)`

Get comprehensive git status.

```ts
const status = await getGitStatus('./my-repo')

if (status) {
  console.log(status.branch)     // "main"
  console.log(status.hasChanges) // true/false
  console.log(status.staged)     // ["file.ts"]
  console.log(status.modified)   // ["other.ts"]
  console.log(status.untracked)  // ["new.ts"]
  console.log(status.ahead)      // 2
  console.log(status.behind)     // 0
}
```

### `getCurrentBranch(dir)`

Get current branch name.

```ts
const branch = await getCurrentBranch('./repo')  // "main"
```

### `hasUncommittedChanges(dir)`

Check if repo has uncommitted changes.

```ts
if (await hasUncommittedChanges('./repo')) {
  console.log('Working directory is dirty')
}
```

## Operations

### `checkout(dir, ref)`

Checkout a branch or ref.

```ts
await checkout('./repo', 'feature-branch')  // true if success
await checkout('./repo', 'v1.0.0')          // checkout tag
```

### `pull(dir)`

Pull latest changes.

```ts
await pull('./repo')  // true if success
```

### `fetch(dir, remote?)`

Fetch from remote.

```ts
await fetch('./repo')           // fetch from 'origin'
await fetch('./repo', 'upstream')
```

### `getRemoteUrl(dir, remote?)`

Get remote URL.

```ts
const url = await getRemoteUrl('./repo')
// → "https://github.com/unjs/unagent.git"
```

### `getLatestCommitHash(dir)`

Get latest commit hash.

```ts
const hash = await getLatestCommitHash('./repo')
// → "abc123..."
```

## Types

```ts
interface CloneOptions {
  depth?: number      // Shallow clone depth (default: 1)
  branch?: string     // Branch to clone
  timeout?: number    // Timeout in ms (default: 60000)
  tempDir?: string    // Custom temp directory
}

interface CloneResult {
  success: boolean
  path: string
  error?: string
}

interface GitStatus {
  isRepo: boolean
  branch: string
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  untracked: string[]
  hasChanges: boolean
}

class GitCloneError extends Error {
  url: string
  cause?: Error
}
```

## Example: Clone and Inspect

```ts
import { cloneToTemp, cleanupTempDir, getGitStatus } from 'unagents/git'

async function inspectRepo(url: string) {
  const { success, path, error } = await cloneToTemp(url)

  if (!success) {
    throw new Error(`Clone failed: ${error}`)
  }

  try {
    const status = await getGitStatus(path)
    console.log(`Branch: ${status?.branch}`)
    return status
  } finally {
    cleanupTempDir(path)
  }
}
```

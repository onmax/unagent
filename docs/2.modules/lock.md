---
icon: i-lucide-lock
---

# lock

Manage `skill.lock` files for tracking installed skills.

```ts
import { readSkillLock, writeSkillLock, addSkillToLock } from 'unagents/lock'
```

## Lockfile Operations

### `readSkillLock(dir, filename?)`

Read lockfile from directory.

```ts
const lock = readSkillLock('~/.claude')
// Returns empty lock if file doesn't exist

console.log(lock.version)  // 1
console.log(lock.skills)   // { 'skill-id': {...}, ... }
```

### `writeSkillLock(dir, lock, filename?)`

Write lockfile to directory.

```ts
const success = writeSkillLock('~/.claude', lock)
// Creates directory if needed
```

### `createEmptyLock()`

Create a new empty lock object.

```ts
const lock = createEmptyLock()
// → { version: 1, skills: {} }
```

## Skill Management

### `addSkillToLock(lock, id, entry)`

Add or update a skill in the lock.

```ts
const newLock = addSkillToLock(lock, 'my-skill', {
  name: 'My Skill',
  source: 'github:user/repo',
  version: '1.0.0',
  hash: 'abc123...',
})
// Automatically sets installedAt and updatedAt
```

### `removeSkillFromLock(lock, id)`

Remove a skill from the lock.

```ts
const newLock = removeSkillFromLock(lock, 'my-skill')
```

### `getSkillFromLock(lock, id)`

Get a skill entry.

```ts
const entry = getSkillFromLock(lock, 'my-skill')
if (entry) {
  console.log(entry.source)
  console.log(entry.installedAt)
}
```

### `hasSkillInLock(lock, id)`

Check if skill exists in lock.

```ts
if (hasSkillInLock(lock, 'my-skill')) {
  console.log('Already installed')
}
```

### `listSkillsInLock(lock)`

Get all skill entries as array.

```ts
const skills = listSkillsInLock(lock)
for (const skill of skills) {
  console.log(`${skill.name}: ${skill.source}`)
}
```

### `isSkillOutdated(lock, id, currentHash)`

Check if installed skill differs from source.

```ts
const currentHash = computeDirectoryHash('./source')
if (isSkillOutdated(lock, 'my-skill', currentHash)) {
  console.log('Skill has updates available')
}
```

## Hashing

### `computeContentHash(content)`

Compute SHA-256 hash of content (first 16 chars).

```ts
const hash = computeContentHash('file contents')
// → "a1b2c3d4e5f6g7h8"
```

### `computeFileHash(filePath)`

Compute hash of a file.

```ts
const hash = computeFileHash('./skill.md')
```

### `computeDirectoryHash(dirPath, exclude?)`

Compute hash of entire directory.

```ts
const hash = computeDirectoryHash('./skill-folder', ['.git', 'node_modules'])
```

## Types

```ts
interface SkillLockEntry {
  name: string
  source: string
  version?: string
  hash: string
  installedAt: string  // ISO timestamp
  updatedAt: string    // ISO timestamp
}

interface SkillLock {
  version: number
  skills: Record<string, SkillLockEntry>
}
```

## Lockfile Format

The `skill.lock` file is JSON:

```json [skill.lock]
{
  "version": 1,
  "skills": {
    "my-skill": {
      "name": "My Skill",
      "source": "github:user/repo",
      "version": "1.0.0",
      "hash": "a1b2c3d4e5f6g7h8",
      "installedAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  }
}
```

## Example: Install with Lock

```ts
import { readSkillLock, writeSkillLock, addSkillToLock, computeDirectoryHash, hasSkillInLock } from 'unagents/lock'

async function installSkill(skillsDir: string, source: string, name: string) {
  const lock = readSkillLock(skillsDir)

  if (hasSkillInLock(lock, name)) {
    console.log(`${name} already installed`)
    return
  }

  // ... copy skill files ...

  const hash = computeDirectoryHash(`${skillsDir}/${name}`)
  const newLock = addSkillToLock(lock, name, {
    name,
    source,
    hash: hash!,
  })

  writeSkillLock(skillsDir, newLock)
}
```

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface SkillLockEntry {
  name: string
  source: string
  version?: string
  hash: string
  installedAt: string
  updatedAt: string
}

export interface SkillLock {
  version: number
  skills: Record<string, SkillLockEntry>
}

const LOCK_VERSION = 1
const DEFAULT_LOCK_FILE = 'skill.lock'

export function createEmptyLock(): SkillLock {
  return { version: LOCK_VERSION, skills: {} }
}

export function readSkillLock(dir: string, filename: string = DEFAULT_LOCK_FILE): SkillLock {
  const lockPath = join(dir, filename)

  if (!existsSync(lockPath)) {
    return createEmptyLock()
  }

  try {
    const content = readFileSync(lockPath, 'utf-8')
    const lock = JSON.parse(content) as SkillLock

    if (lock.version !== LOCK_VERSION) {
      return createEmptyLock()
    }

    return lock
  }
  catch {
    return createEmptyLock()
  }
}

export function writeSkillLock(dir: string, lock: SkillLock, filename: string = DEFAULT_LOCK_FILE): boolean {
  const lockPath = join(dir, filename)

  try {
    const lockDir = dirname(lockPath)
    if (!existsSync(lockDir)) {
      mkdirSync(lockDir, { recursive: true })
    }

    const content = JSON.stringify(lock, null, 2)
    writeFileSync(lockPath, content, 'utf-8')
    return true
  }
  catch {
    return false
  }
}

export function addSkillToLock(lock: SkillLock, id: string, entry: Omit<SkillLockEntry, 'installedAt' | 'updatedAt'>): SkillLock {
  const now = new Date().toISOString()
  const existing = lock.skills[id]

  return {
    ...lock,
    skills: {
      ...lock.skills,
      [id]: {
        ...entry,
        installedAt: existing?.installedAt || now,
        updatedAt: now,
      },
    },
  }
}

export function removeSkillFromLock(lock: SkillLock, id: string): SkillLock {
  const { [id]: _, ...rest } = lock.skills
  return { ...lock, skills: rest }
}

export function getSkillFromLock(lock: SkillLock, id: string): SkillLockEntry | undefined {
  return lock.skills[id]
}

export function hasSkillInLock(lock: SkillLock, id: string): boolean {
  return id in lock.skills
}

export function listSkillsInLock(lock: SkillLock): SkillLockEntry[] {
  return Object.values(lock.skills)
}

export function isSkillOutdated(lock: SkillLock, id: string, currentHash: string): boolean {
  const entry = lock.skills[id]
  if (!entry)
    return true
  return entry.hash !== currentHash
}

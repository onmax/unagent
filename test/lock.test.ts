import { describe, expect, it } from 'vitest'
import { addSkillToLock, computeContentHash, createEmptyLock, getSkillFromLock, hasSkillInLock, isSkillOutdated, listSkillsInLock, removeSkillFromLock } from '../src/lock'

describe('lock/hash', () => {
  it('computeContentHash returns consistent hash', () => {
    const hash1 = computeContentHash('test content')
    const hash2 = computeContentHash('test content')
    expect(hash1).toBe(hash2)
    expect(hash1.length).toBe(16)
  })

  it('computeContentHash returns different hash for different content', () => {
    const hash1 = computeContentHash('content a')
    const hash2 = computeContentHash('content b')
    expect(hash1).not.toBe(hash2)
  })
})

describe('lock/lock', () => {
  it('createEmptyLock returns valid structure', () => {
    const lock = createEmptyLock()
    expect(lock.version).toBe(1)
    expect(lock.skills).toEqual({})
  })

  it('addSkillToLock adds entry', () => {
    const lock = createEmptyLock()
    const updated = addSkillToLock(lock, 'test', { name: 'Test', source: 'github:a/b', hash: 'abc123' })
    expect(updated.skills.test).toBeDefined()
    expect(updated.skills.test.name).toBe('Test')
    expect(updated.skills.test.installedAt).toBeDefined()
  })

  it('removeSkillFromLock removes entry', () => {
    let lock = createEmptyLock()
    lock = addSkillToLock(lock, 'test', { name: 'Test', source: 'github:a/b', hash: 'abc123' })
    const updated = removeSkillFromLock(lock, 'test')
    expect(updated.skills.test).toBeUndefined()
  })

  it('hasSkillInLock checks existence', () => {
    let lock = createEmptyLock()
    expect(hasSkillInLock(lock, 'test')).toBe(false)
    lock = addSkillToLock(lock, 'test', { name: 'Test', source: 'github:a/b', hash: 'abc123' })
    expect(hasSkillInLock(lock, 'test')).toBe(true)
  })

  it('getSkillFromLock returns entry', () => {
    let lock = createEmptyLock()
    lock = addSkillToLock(lock, 'test', { name: 'Test', source: 'github:a/b', hash: 'abc123' })
    const entry = getSkillFromLock(lock, 'test')
    expect(entry?.name).toBe('Test')
  })

  it('listSkillsInLock returns all entries', () => {
    let lock = createEmptyLock()
    lock = addSkillToLock(lock, 'a', { name: 'A', source: 'x', hash: '1' })
    lock = addSkillToLock(lock, 'b', { name: 'B', source: 'y', hash: '2' })
    const list = listSkillsInLock(lock)
    expect(list).toHaveLength(2)
  })

  it('isSkillOutdated compares hashes', () => {
    let lock = createEmptyLock()
    lock = addSkillToLock(lock, 'test', { name: 'Test', source: 'github:a/b', hash: 'abc123' })
    expect(isSkillOutdated(lock, 'test', 'abc123')).toBe(false)
    expect(isSkillOutdated(lock, 'test', 'different')).toBe(true)
    expect(isSkillOutdated(lock, 'nonexistent', 'any')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { isPathSafe, sanitizeName, validateSymlinkTarget } from '../src/link'

describe('link/sanitize', () => {
  it('sanitizeName creates kebab-case', () => {
    expect(sanitizeName('My Skill')).toBe('my-skill')
    expect(sanitizeName('Test_Skill.v2')).toBe('test-skill-v2')
    expect(sanitizeName('CamelCase')).toBe('camelcase')
  })

  it('sanitizeName limits length', () => {
    const long = 'a'.repeat(150)
    expect(sanitizeName(long).length).toBeLessThanOrEqual(100)
  })

  it('isPathSafe prevents traversal', () => {
    expect(isPathSafe('valid/path', '/base')).toBe(true)
    expect(isPathSafe('../escape', '/base')).toBe(false)
    expect(isPathSafe('path/with/..', '/base')).toBe(false)
  })

  it('validateSymlinkTarget checks validity', () => {
    expect(validateSymlinkTarget('/valid/path')).toBe(true)
    expect(validateSymlinkTarget('')).toBe(false)
    expect(validateSymlinkTarget('path\0with\0null')).toBe(false)
  })
})

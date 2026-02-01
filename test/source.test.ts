import { describe, expect, it } from 'vitest'
import { getOwnerRepo, isLocalPath, isUrl, parseGitHubUrl, parseOwnerRepo, parseSource } from '../src/source'

describe('source/parse', () => {
  it('isLocalPath detects local paths', () => {
    expect(isLocalPath('/absolute/path')).toBe(true)
    expect(isLocalPath('./relative')).toBe(true)
    expect(isLocalPath('../parent')).toBe(true)
    expect(isLocalPath('~/home')).toBe(true)
    expect(isLocalPath('github:owner/repo')).toBe(false)
  })

  it('isUrl detects URLs', () => {
    expect(isUrl('https://example.com')).toBe(true)
    expect(isUrl('http://example.com')).toBe(true)
    expect(isUrl('github:owner/repo')).toBe(true)
    expect(isUrl('./local')).toBe(false)
  })

  it('parseSource handles GitHub shorthand', () => {
    const result = parseSource('owner/repo')
    expect(result.type).toBe('github')
    expect(result.owner).toBe('owner')
    expect(result.repo).toBe('repo')
    expect(result.isLocal).toBe(false)
  })

  it('parseSource handles local paths', () => {
    const result = parseSource('./local/path')
    expect(result.type).toBe('local')
    expect(result.isLocal).toBe(true)
  })

  it('getOwnerRepo returns formatted string', () => {
    expect(getOwnerRepo({ type: 'github', raw: '', owner: 'a', repo: 'b', isLocal: false })).toBe('a/b')
    expect(getOwnerRepo({ type: 'local', raw: '', isLocal: true })).toBeUndefined()
  })

  it('parseOwnerRepo splits correctly', () => {
    expect(parseOwnerRepo('owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseOwnerRepo('invalid')).toBeUndefined()
  })
})

describe('source/providers', () => {
  it('parseGitHubUrl parses shorthand', () => {
    const result = parseGitHubUrl('github:vercel/next.js')
    expect(result?.provider).toBe('github')
    expect(result?.owner).toBe('vercel')
    expect(result?.repo).toBe('next.js')
  })

  it('parseGitHubUrl parses full URL', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js')
    expect(result?.provider).toBe('github')
    expect(result?.owner).toBe('vercel')
    expect(result?.repo).toBe('next.js')
  })
})

import { homedir } from 'node:os'
import { normalize } from 'pathe'
import { describe, expect, it } from 'vitest'
import { expandPath, formatList, pluralize, shortenPath, stripAnsi, truncate } from '../src/utils'

describe('utils/path', () => {
  it('shortenPath replaces home with ~', () => {
    const home = normalize(homedir())
    expect(shortenPath(`${home}/test`)).toBe('~/test')
  })

  it('expandPath expands ~', () => {
    const home = normalize(homedir())
    expect(expandPath('~/test')).toBe(`${home}/test`)
  })
})

describe('utils/format', () => {
  it('formatList shows all items when under max', () => {
    expect(formatList(['a', 'b'])).toBe('a, b')
  })

  it('formatList truncates and shows count', () => {
    expect(formatList(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c +2 more')
  })

  it('pluralize handles singular and plural', () => {
    expect(pluralize(1, 'item')).toBe('item')
    expect(pluralize(2, 'item')).toBe('items')
    expect(pluralize(0, 'item')).toBe('items')
  })

  it('truncate shortens long strings', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
    expect(truncate('short', 10)).toBe('short')
  })
})

describe('utils/ansi', () => {
  it('stripAnsi removes ANSI codes', () => {
    expect(stripAnsi('\x1B[31mred\x1B[0m')).toBe('red')
  })
})

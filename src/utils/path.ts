import { homedir } from 'node:os'
import { relative, resolve } from 'node:path'

export function shortenPath(filepath: string, cwd?: string): string {
  const home = homedir()
  const resolved = resolve(filepath)

  if (cwd) {
    const rel = relative(cwd, resolved)
    if (!rel.startsWith('..')) {
      return rel.startsWith('.') ? rel : `./${rel}`
    }
  }

  if (resolved.startsWith(home)) {
    return `~${resolved.slice(home.length)}`
  }

  return resolved
}

export function expandPath(filepath: string): string {
  if (filepath.startsWith('~')) {
    return `${homedir()}${filepath.slice(1)}`
  }
  return resolve(filepath)
}

export function normalizePath(filepath: string): string {
  return filepath.replace(/\\/g, '/')
}

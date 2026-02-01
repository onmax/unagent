import { homedir } from 'node:os'
import { normalize, relative, resolve } from 'pathe'

export function shortenPath(filepath: string, cwd?: string): string {
  const home = normalize(homedir())
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
    return `${normalize(homedir())}${filepath.slice(1)}`
  }
  return resolve(filepath)
}

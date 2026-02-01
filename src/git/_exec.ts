import { execSync } from 'node:child_process'

export interface GitExecOptions {
  cwd?: string
  timeout?: number
}

export function git(args: string[], opts?: GitExecOptions): string {
  return execSync(`git ${args.join(' ')}`, {
    cwd: opts?.cwd,
    timeout: opts?.timeout,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

export interface GitStatusParsed {
  branch: string
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  untracked: string[]
}

export function parseGitStatus(output: string): GitStatusParsed {
  const lines = output.split('\n').filter(Boolean)
  const result: GitStatusParsed = { branch: 'HEAD', ahead: 0, behind: 0, staged: [], modified: [], untracked: [] }

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      result.branch = line.slice(14)
    }
    else if (line.startsWith('# branch.ab ')) {
      const match = line.match(/\+(\d+) -(\d+)/)
      if (match) {
        result.ahead = Number.parseInt(match[1], 10)
        result.behind = Number.parseInt(match[2], 10)
      }
    }
    else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const xy = line.slice(2, 4)
      const path = line.split('\t').pop() || line.split(' ').pop() || ''
      if (xy[0] !== '.')
        result.staged.push(path)
      if (xy[1] !== '.')
        result.modified.push(path)
    }
    else if (line.startsWith('? ')) {
      result.untracked.push(line.slice(2))
    }
  }
  return result
}

export const ANSI = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  white: '\x1B[37m',
  gray: '\x1B[90m',
} as const

const ANSI_REGEX = /\x1B\[[0-9;]*m/g

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '')
}

export function bold(str: string): string {
  return `${ANSI.bold}${str}${ANSI.reset}`
}

export function dim(str: string): string {
  return `${ANSI.dim}${str}${ANSI.reset}`
}

export function red(str: string): string {
  return `${ANSI.red}${str}${ANSI.reset}`
}

export function green(str: string): string {
  return `${ANSI.green}${str}${ANSI.reset}`
}

export function yellow(str: string): string {
  return `${ANSI.yellow}${str}${ANSI.reset}`
}

export function blue(str: string): string {
  return `${ANSI.blue}${str}${ANSI.reset}`
}

export function cyan(str: string): string {
  return `${ANSI.cyan}${str}${ANSI.reset}`
}

export function gray(str: string): string {
  return `${ANSI.gray}${str}${ANSI.reset}`
}

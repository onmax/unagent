import type { Buffer } from 'node:buffer'
import { spawn, spawnSync } from 'node:child_process'

export interface ExecOptions {
  cwd?: string
  timeout?: number
  maxOutput?: number
  env?: Record<string, string>
  stdin?: string
}

export interface ExecResult {
  ok: boolean
  code: number | null
  stdout: string
  stderr: string
  signal: string | null
  truncated: boolean
  timedOut: boolean
}

const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_OUTPUT = 100_000

export function execSafe(command: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  const { cwd, timeout = DEFAULT_TIMEOUT, maxOutput = DEFAULT_MAX_OUTPUT, env, stdin } = options

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let truncated = false
    let timedOut = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const proc = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const truncateOutput = (current: string, chunk: string): string => {
      const combined = current + chunk
      if (combined.length > maxOutput) {
        truncated = true
        return combined.slice(0, maxOutput)
      }
      return combined
    }

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout = truncateOutput(stdout, chunk.toString())
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr = truncateOutput(stderr, chunk.toString())
    })

    if (stdin !== undefined) {
      proc.stdin?.write(stdin)
      proc.stdin?.end()
    }
    else {
      proc.stdin?.end()
    }

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true
        proc.kill('SIGTERM')
        setTimeout(() => proc.kill('SIGKILL'), 1000)
      }, timeout)
    }

    proc.on('close', (code, signal) => {
      if (timeoutId)
        clearTimeout(timeoutId)

      resolve({
        ok: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        signal: signal ?? null,
        truncated,
        timedOut,
      })
    })

    proc.on('error', (err) => {
      if (timeoutId)
        clearTimeout(timeoutId)

      resolve({
        ok: false,
        code: null,
        stdout: stdout.trim(),
        stderr: err.message,
        signal: null,
        truncated,
        timedOut,
      })
    })
  })
}

export function execSafeSync(command: string, args: string[], options: Omit<ExecOptions, 'stdin'> = {}): ExecResult {
  const { cwd, timeout = DEFAULT_TIMEOUT, maxOutput = DEFAULT_MAX_OUTPUT, env } = options
  let truncated = false

  const result = spawnSync(command, args, {
    cwd,
    timeout,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: maxOutput * 2,
  })

  const timedOut = result.signal === 'SIGTERM'
  let stdout = result.stdout ?? ''
  let stderr = result.stderr ?? ''

  if (stdout.length > maxOutput) {
    stdout = stdout.slice(0, maxOutput)
    truncated = true
  }
  if (stderr.length > maxOutput) {
    stderr = stderr.slice(0, maxOutput)
    truncated = true
  }

  return {
    ok: result.status === 0,
    code: result.status,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    signal: result.signal ?? null,
    truncated,
    timedOut,
  }
}

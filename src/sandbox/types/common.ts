export type SandboxProvider = 'vercel' | 'cloudflare' | 'deno'

export interface SandboxDetectionResult {
  type: 'cloudflare' | 'vercel' | 'deno' | 'docker' | 'none'
  details?: Record<string, unknown>
}

export interface SandboxExecOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  sudo?: boolean
  onStdout?: (data: string) => void
  onStderr?: (data: string) => void
}

export interface SandboxExecResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number | null
}

export interface SandboxCapabilities {
  execEnv: boolean
  execCwd: boolean
  execSudo: boolean
  listFiles: boolean
  exists: boolean
  deleteFile: boolean
  moveFile: boolean
  readFileStream: boolean
  startProcess: boolean
}

export interface SandboxFileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  mtime?: string
}

export interface SandboxListFilesOptions {
  recursive?: boolean
}

export interface SandboxProcessOptions {
  cwd?: string
  env?: Record<string, string>
}

export interface SandboxWaitForPortOptions {
  timeout?: number
  hostname?: string
}

export interface SandboxProcess {
  readonly id: string
  readonly command: string
  kill: (signal?: string) => Promise<void>
  logs: () => Promise<{ stdout: string, stderr: string }>
  wait: (timeout?: number) => Promise<{ exitCode: number }>
  waitForLog: (pattern: string | RegExp, timeout?: number) => Promise<{ line: string }>
  waitForPort: (port: number, opts?: SandboxWaitForPortOptions) => Promise<void>
}

export interface CloudflareSandboxOptions {
  sleepAfter?: string | number
  keepAlive?: boolean
  normalizeId?: boolean
}

export interface DurableObjectNamespaceLike {
  idFromName: (name: string) => unknown
  get: (id: unknown) => unknown
}

export interface VercelSandboxCredentials {
  token: string
  teamId: string
  projectId: string
}

export interface VercelSandboxProviderOptions {
  name: 'vercel'
  runtime?: string
  timeout?: number
  cpu?: number
  ports?: number[]
  credentials?: VercelSandboxCredentials
}

export interface CloudflareSandboxProviderOptions {
  name: 'cloudflare'
  namespace: DurableObjectNamespaceLike
  sandboxId?: string
  cloudflare?: CloudflareSandboxOptions
  getSandbox?: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T
}

export interface DenoSandboxProviderOptions {
  name: 'deno'
  allowNet?: string[]
  debug?: boolean
  env?: Record<string, string>
  labels?: Record<string, string>
  memory?: string | number
  port?: number
  region?: string
  root?: string
  sandboxEndpoint?: string
  secrets?: Record<string, { hosts: string[], value: string }>
  ssh?: boolean
  timeout?: `${number}s` | `${number}m` | 'session'
  volumes?: Record<string, string>
}

export type SandboxProviderOptions = VercelSandboxProviderOptions | CloudflareSandboxProviderOptions | DenoSandboxProviderOptions

export interface SandboxOptions {
  provider?: SandboxProviderOptions
}

export interface SandboxConfigValidationIssue {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning'
}

export interface SandboxConfigValidationResult {
  provider: SandboxProvider
  ok: boolean
  issues: SandboxConfigValidationIssue[]
}

export interface CloudflareSandboxExecResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  command: string
  duration: number
  timestamp: string
  sessionId?: string
}

export interface CloudflareSandboxWriteFileResult {
  success: boolean
  path: string
  timestamp: string
  exitCode?: number
}

export interface CloudflareSandboxReadFileResult {
  success: boolean
  path: string
  content: string
  timestamp: string
  exitCode?: number
  encoding?: 'utf-8' | 'base64'
  isBinary?: boolean
  mimeType?: string
  size?: number
}

export interface CloudflareSandboxStub {
  exec: (cmd: string, opts?: { timeout?: number, env?: Record<string, string | undefined>, cwd?: string, stream?: boolean, onOutput?: (data: string, stream: 'stdout' | 'stderr') => void }) => Promise<CloudflareSandboxExecResult>
  writeFile: (path: string, content: string, opts?: { encoding?: string }) => Promise<CloudflareSandboxWriteFileResult>
  readFile: (path: string, opts?: { encoding?: string }) => Promise<CloudflareSandboxReadFileResult>
  readFileStream?: (path: string) => Promise<ReadableStream<Uint8Array>>
  mkdir?: (path: string, opts?: { recursive?: boolean }) => Promise<{ success: boolean }>
  listFiles?: (path: string, opts?: { recursive?: boolean }) => Promise<{ files: Array<{ name: string, path: string, type: 'file' | 'directory', size?: number, mtime?: string }> }>
  exists?: (path: string) => Promise<{ exists: boolean }>
  deleteFile?: (path: string) => Promise<{ success: boolean }>
  moveFile?: (src: string, dst: string) => Promise<{ success: boolean }>
  startProcess?: (cmd: string, args?: string[], opts?: { cwd?: string, env?: Record<string, string> }) => Promise<CloudflareSandboxProcessInfo>
  destroy: () => Promise<void>
}

export interface CloudflareSandboxProcessInfo {
  id: string
  command: string
  kill: (signal?: string) => Promise<void>
  logs: () => Promise<{ stdout: string, stderr: string }>
  wait: (timeout?: number) => Promise<{ exitCode: number }>
  waitForLog?: (pattern: string | RegExp, timeout?: number) => Promise<{ line: string }>
  waitForPort?: (port: number, opts?: { timeout?: number, hostname?: string }) => Promise<void>
}

export type SandboxProvider = 'vercel' | 'cloudflare'

// === Exec Options ===
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

// === File Operations ===
export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  mtime?: string
}

export interface ListFilesOptions {
  recursive?: boolean
}

// === Process ===
export interface ProcessOptions {
  cwd?: string
  env?: Record<string, string>
}

export interface WaitForPortOptions {
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
  waitForPort: (port: number, opts?: WaitForPortOptions) => Promise<void>
}

// === Provider Options ===
export interface CloudflareSandboxOptions {
  sleepAfter?: string | number
  keepAlive?: boolean
  normalizeId?: boolean
}

export interface DurableObjectNamespaceLike {
  idFromName: (name: string) => unknown
  get: (id: unknown) => unknown
}

export interface VercelProviderOptions {
  name: 'vercel'
  runtime?: string
  timeout?: number
  cpu?: number
  ports?: number[]
}

export interface CloudflareProviderOptions {
  name: 'cloudflare'
  namespace: DurableObjectNamespaceLike
  sandboxId?: string
  cloudflare?: CloudflareSandboxOptions
  getSandbox?: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T
}

export type SandboxProviderOptions = VercelProviderOptions | CloudflareProviderOptions

export interface SandboxOptions {
  provider?: SandboxProviderOptions
}

// === Cloudflare Stub Types ===
export interface CloudflareExecResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  command: string
  duration: number
  timestamp: string
  sessionId?: string
}

export interface CloudflareWriteFileResult {
  success: boolean
  path: string
  timestamp: string
  exitCode?: number
}

export interface CloudflareReadFileResult {
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
  exec: (cmd: string, opts?: { timeout?: number, env?: Record<string, string | undefined>, cwd?: string, stream?: boolean, onOutput?: (data: string, stream: 'stdout' | 'stderr') => void }) => Promise<CloudflareExecResult>
  writeFile: (path: string, content: string, opts?: { encoding?: string }) => Promise<CloudflareWriteFileResult>
  readFile: (path: string, opts?: { encoding?: string }) => Promise<CloudflareReadFileResult>
  readFileStream?: (path: string) => Promise<ReadableStream<Uint8Array>>
  mkdir?: (path: string, opts?: { recursive?: boolean }) => Promise<{ success: boolean }>
  listFiles?: (path: string, opts?: { recursive?: boolean }) => Promise<{ files: Array<{ name: string, path: string, type: 'file' | 'directory', size?: number, mtime?: string }> }>
  exists?: (path: string) => Promise<{ exists: boolean }>
  deleteFile?: (path: string) => Promise<{ success: boolean }>
  moveFile?: (src: string, dst: string) => Promise<{ success: boolean }>
  startProcess?: (cmd: string, args?: string[], opts?: { cwd?: string, env?: Record<string, string> }) => Promise<CloudflareProcessInfo>
  destroy: () => Promise<void>
}

export interface CloudflareProcessInfo {
  id: string
  command: string
  kill: (signal?: string) => Promise<void>
  logs: () => Promise<{ stdout: string, stderr: string }>
  wait: (timeout?: number) => Promise<{ exitCode: number }>
  waitForLog?: (pattern: string | RegExp, timeout?: number) => Promise<{ line: string }>
  waitForPort?: (port: number, opts?: { timeout?: number, hostname?: string }) => Promise<void>
}

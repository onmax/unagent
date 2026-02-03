export type SandboxProvider = 'vercel' | 'cloudflare'
export type SandboxType = 'docker' | 'cloudflare' | 'vercel' | 'none'

export interface VercelProviderOptions {
  name: 'vercel'
  runtime?: string
  timeout?: number
  cpu?: number
}

export interface CloudflareProviderOptions {
  name: 'cloudflare'
  namespace: DurableObjectNamespaceLike
  sandboxId?: string
  cloudflare?: CloudflareSandboxOptions
  /** Pass getSandbox explicitly for workerd (dynamic import fails there) */
  getSandbox?: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T
}

export type SandboxProviderOptions = VercelProviderOptions | CloudflareProviderOptions

export interface SandboxOptions {
  provider?: SandboxProviderOptions
}

export interface SandboxExecResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number | null
}

export interface Sandbox {
  id: string
  provider: SandboxProvider
  exec: (command: string, args: string[]) => Promise<SandboxExecResult>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  stop: () => Promise<void>
}

export interface SandboxDetection {
  type: SandboxType
  details?: Record<string, string>
}

export interface CloudflareSandboxOptions {
  sleepAfter?: string | number
  keepAlive?: boolean
  normalizeId?: boolean
}

/** DurableObjectNamespace shape - matches Cloudflare Workers runtime */
export interface DurableObjectNamespaceLike {
  idFromName: (name: string) => unknown
  get: (id: unknown) => unknown
}

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
  exec: (cmd: string, opts?: { timeout?: number, env?: Record<string, string | undefined>, cwd?: string }) => Promise<CloudflareExecResult>
  writeFile: (path: string, content: string, opts?: { encoding?: string }) => Promise<CloudflareWriteFileResult>
  readFile: (path: string, opts?: { encoding?: string }) => Promise<CloudflareReadFileResult>
  destroy: () => Promise<void>
}

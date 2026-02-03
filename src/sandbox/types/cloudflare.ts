import type { CloudflareSandboxStub } from './common'

// === Git ===
export interface GitCheckoutOptions {
  branch?: string
  depth?: number
  sparse?: string[]
}

export interface GitCheckoutResult {
  success: boolean
  path: string
  branch: string
  commit: string
}

// === Sessions ===
export interface SessionOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
}

export interface CloudflareSession {
  id: string
  exec: (cmd: string, opts?: { timeout?: number, env?: Record<string, string>, cwd?: string }) => Promise<{ stdout: string, stderr: string, exitCode: number }>
  startProcess: (cmd: string, args?: string[], opts?: { cwd?: string, env?: Record<string, string> }) => Promise<CloudflareSessionProcess>
  destroy: () => Promise<void>
}

export interface CloudflareSessionProcess {
  id: string
  kill: (signal?: string) => Promise<void>
  logs: () => Promise<{ stdout: string, stderr: string }>
  wait: (timeout?: number) => Promise<{ exitCode: number }>
}

// === Code Interpreter ===
export interface CodeContextOptions {
  language?: 'python' | 'javascript' | 'typescript'
  timeout?: number
}

export interface RunCodeOptions {
  context?: CodeContext
  timeout?: number
  language?: 'python' | 'javascript' | 'typescript'
}

export interface CodeExecutionResult {
  success: boolean
  output: string
  error?: string
  executionTime: number
}

export interface CodeContext {
  id: string
  language: 'python' | 'javascript' | 'typescript'
  createdAt: string
}

// === Ports ===
export interface ExposePortOptions {
  hostname?: string
  protocol?: 'http' | 'https'
}

export interface ExposedPort {
  port: number
  url: string
  hostname: string
}

// === Buckets ===
export interface MountBucketOptions {
  readonly?: boolean
}

// === Cloudflare Namespace ===
export interface CloudflareNamespace {
  readonly native: CloudflareSandboxStub

  // Git
  gitCheckout: (url: string, opts?: GitCheckoutOptions) => Promise<GitCheckoutResult>

  // Sessions
  createSession: (opts?: SessionOptions) => Promise<CloudflareSession>
  getSession: (id: string) => Promise<CloudflareSession>
  deleteSession: (id: string) => Promise<void>

  // Code interpreter
  createCodeContext: (opts?: CodeContextOptions) => Promise<CodeContext>
  runCode: (code: string, opts?: RunCodeOptions) => Promise<CodeExecutionResult>
  listCodeContexts: () => Promise<CodeContext[]>
  deleteCodeContext: (id: string) => Promise<void>

  // Ports
  exposePort: (port: number, opts?: ExposePortOptions) => Promise<{ url: string }>
  unexposePort: (port: number) => Promise<void>
  getExposedPorts: (hostname?: string) => Promise<ExposedPort[]>

  // Buckets
  mountBucket: (bucket: string, path: string, opts?: MountBucketOptions) => Promise<void>
  unmountBucket: (path: string) => Promise<void>

  // Env
  setEnvVars: (vars: Record<string, string | undefined>) => Promise<void>

  // WebSocket
  wsConnect: (request: Request, port: number) => Promise<Response>
}

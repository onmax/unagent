import type { CloudflareSandboxStub } from './common'

export interface SandboxGitCheckoutOptions {
  branch?: string
  depth?: number
  sparse?: string[]
}

export interface SandboxGitCheckoutResult {
  success: boolean
  path: string
  branch: string
  commit: string
}

export interface CloudflareSandboxSessionOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
}

export interface CloudflareSandboxSession {
  id: string
  exec: (cmd: string, opts?: { timeout?: number, env?: Record<string, string>, cwd?: string }) => Promise<{ stdout: string, stderr: string, exitCode: number }>
  startProcess: (cmd: string, args?: string[], opts?: { cwd?: string, env?: Record<string, string> }) => Promise<CloudflareSandboxSessionProcess>
  destroy: () => Promise<void>
}

export interface CloudflareSandboxSessionProcess {
  id: string
  kill: (signal?: string) => Promise<void>
  logs: () => Promise<{ stdout: string, stderr: string }>
  wait: (timeout?: number) => Promise<{ exitCode: number }>
}

export interface SandboxCodeContextOptions {
  language?: 'python' | 'javascript' | 'typescript'
  timeout?: number
}

export interface SandboxRunCodeOptions {
  context?: SandboxCodeContext
  timeout?: number
  language?: 'python' | 'javascript' | 'typescript'
}

export interface SandboxCodeExecutionResult {
  success: boolean
  output: string
  error?: string
  executionTime: number
}

export interface SandboxCodeContext {
  id: string
  language: 'python' | 'javascript' | 'typescript'
  createdAt: string
}

export interface SandboxExposePortOptions {
  hostname?: string
  protocol?: 'http' | 'https'
}

export interface SandboxExposedPort {
  port: number
  url: string
  hostname: string
}

export interface SandboxMountBucketOptions {
  readonly?: boolean
}

export interface CloudflareSandboxNamespace {
  readonly native: CloudflareSandboxStub
  gitCheckout: (url: string, opts?: SandboxGitCheckoutOptions) => Promise<SandboxGitCheckoutResult>
  createSession: (opts?: CloudflareSandboxSessionOptions) => Promise<CloudflareSandboxSession>
  getSession: (id: string) => Promise<CloudflareSandboxSession>
  deleteSession: (id: string) => Promise<void>
  createCodeContext: (opts?: SandboxCodeContextOptions) => Promise<SandboxCodeContext>
  runCode: (code: string, opts?: SandboxRunCodeOptions) => Promise<SandboxCodeExecutionResult>
  listCodeContexts: () => Promise<SandboxCodeContext[]>
  deleteCodeContext: (id: string) => Promise<void>
  exposePort: (port: number, opts?: SandboxExposePortOptions) => Promise<{ url: string }>
  unexposePort: (port: number) => Promise<void>
  getExposedPorts: (hostname?: string) => Promise<SandboxExposedPort[]>
  mountBucket: (bucket: string, path: string, opts?: SandboxMountBucketOptions) => Promise<void>
  unmountBucket: (path: string) => Promise<void>
  setEnvVars: (vars: Record<string, string | undefined>) => Promise<void>
  wsConnect: (request: Request, port: number) => Promise<Response>
}

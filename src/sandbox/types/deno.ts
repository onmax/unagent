export type DenoSandboxMemory = string | number
export type DenoSandboxRegion = string
export type DenoSandboxSignal = string

export interface DenoSandboxSecretConfig {
  hosts: string[]
  value: string
}

export interface DenoSandboxOptions {
  allowNet?: string[]
  debug?: boolean
  env?: Record<string, string>
  labels?: Record<string, string>
  memory?: DenoSandboxMemory
  port?: number
  region?: DenoSandboxRegion
  root?: string
  sandboxEndpoint?: string
  secrets?: Record<string, DenoSandboxSecretConfig>
  ssh?: boolean
  timeout?: `${number}s` | `${number}m` | 'session'
  volumes?: Record<string, string>
}

export interface DenoSandboxSpawnOptions {
  args?: string[]
  cwd?: string | URL
  clearEnv?: boolean
  env?: Record<string, string>
  signal?: AbortSignal
  stdin?: 'piped' | 'null'
  stdout?: 'piped' | 'inherit' | 'null'
  stderr?: 'piped' | 'inherit' | 'null'
}

export interface DenoSandboxChildProcessStatus {
  success: boolean
  code: number
  signal: DenoSandboxSignal | null
}

export interface DenoSandboxChildProcessOutput {
  status: DenoSandboxChildProcessStatus
  readonly stdout: Uint8Array | null
  readonly stderr: Uint8Array | null
  readonly stdoutText: string | null
  readonly stderrText: string | null
}

export interface DenoSandboxChildProcess {
  readonly pid: number
  readonly status: Promise<DenoSandboxChildProcessStatus>
  readonly stdin: WritableStream<Uint8Array> | null
  readonly stdout: ReadableStream<Uint8Array> | null
  readonly stderr: ReadableStream<Uint8Array> | null
  [Symbol.asyncDispose]: () => Promise<void>
  kill: (signal?: DenoSandboxSignal) => Promise<void>
  output: () => Promise<DenoSandboxChildProcessOutput>
}

export interface SandboxCommandBuilder {
  output: () => Promise<DenoSandboxChildProcessOutput>
}

export interface DenoSandboxDirEntry {
  name: string
  isFile: boolean
  isDirectory: boolean
  isSymlink: boolean
}

export interface DenoSandboxFileInfo {
  size: number
  isFile: boolean
  isDirectory: boolean
  isSymlink: boolean
  mtime?: Date | null
}

export interface SandboxFs {
  readTextFile: (path: string) => Promise<string>
  readFile: (path: string) => Promise<Uint8Array>
  writeTextFile: (path: string, data: string) => Promise<void>
  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>
  readDir: (path: string) => AsyncIterable<DenoSandboxDirEntry>
  stat: (path: string) => Promise<DenoSandboxFileInfo>
  remove: (path: string, opts?: { recursive?: boolean }) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
}

export interface SandboxEnv {
  get: (key: string) => Promise<string | undefined>
  set: (key: string, value: string) => Promise<void>
  delete: (key: string) => Promise<void>
  toObject: () => Promise<Record<string, string>>
}

export interface SandboxDeno {
  deploy: (path: string, options?: Record<string, unknown>) => Promise<unknown>
  eval: (code: string, options?: Record<string, unknown>) => Promise<unknown>
  repl: (options?: Record<string, unknown>) => Promise<DenoSandboxChildProcess>
  run: (path: string, options?: Record<string, unknown>) => Promise<DenoSandboxChildProcess>
}

export interface DenoSandboxVsCodeOptions {
  [key: string]: unknown
}

export interface DenoSandboxVsCode {
  url: string
  token?: string
  [key: string]: unknown
}

export interface DenoSandboxInstance {
  readonly id: string
  readonly closed: Promise<void>
  readonly deno: SandboxDeno
  readonly env: SandboxEnv
  readonly fs: SandboxFs
  readonly ssh?: { username: string, hostname: string }
  readonly url?: string
  sh: (templateStrings: TemplateStringsArray, ...substitutions: unknown[]) => SandboxCommandBuilder
  close: () => Promise<void>
  exposeHttp: (target: { port: number } | { pid: number }) => Promise<string>
  exposeSsh: () => Promise<{ hostname: string, username: string }>
  exposeVscode: (path?: string, options?: DenoSandboxVsCodeOptions) => Promise<DenoSandboxVsCode>
  extendTimeout: (timeout: `${number}s` | `${number}m`) => Promise<Date>
  fetch: (url: string | URL, init?: RequestInit) => Promise<Response>
  kill: () => Promise<void>
  spawn: (command: string | URL, options?: DenoSandboxSpawnOptions) => Promise<DenoSandboxChildProcess>
  [Symbol.asyncDispose]: () => Promise<void>
}

export interface DenoSandboxSDK {
  Sandbox: {
    create: (options?: DenoSandboxOptions) => Promise<DenoSandboxInstance>
  }
}

export interface DenoSandboxNamespace {
  readonly native: DenoSandboxInstance
  readonly runtime: SandboxDeno
  readonly env: SandboxEnv
  readonly fs: SandboxFs
  readonly url?: string
  readonly ssh?: { username: string, hostname: string }
  exposeHttp: (target: { port: number } | { pid: number }) => Promise<string>
  exposeSsh: () => Promise<{ hostname: string, username: string }>
  exposeVscode: (path?: string, options?: DenoSandboxVsCodeOptions) => Promise<DenoSandboxVsCode>
  extendTimeout: (timeout: `${number}s` | `${number}m`) => Promise<Date>
  fetch: (url: string | URL, init?: RequestInit) => Promise<Response>
  close: () => Promise<void>
  kill: () => Promise<void>
  spawn: (command: string | URL, options?: DenoSandboxSpawnOptions) => Promise<DenoSandboxChildProcess>
}

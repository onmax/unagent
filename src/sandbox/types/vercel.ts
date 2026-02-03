// === Vercel SDK Types ===
export interface VercelRunCommandParams {
  cmd: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  sudo?: boolean
  detached?: boolean
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  signal?: AbortSignal
}

export interface VercelSandboxInstance {
  runCommand: {
    (cmd: string, args?: string[], opts?: { signal?: AbortSignal }): Promise<VercelCommandResult>
    (params: VercelRunCommandParams & { detached: true }): Promise<VercelCommandResult>
    (params: VercelRunCommandParams): Promise<VercelCommandResult>
  }
  writeFiles: (files: Array<{ path: string, content: Uint8Array }>, opts?: { signal?: AbortSignal }) => Promise<void>
  readFileToBuffer: (opts: { path: string, cwd?: string }, opts2?: { signal?: AbortSignal }) => Promise<Uint8Array | null>
  readFile: (opts: { path: string, cwd?: string }, opts2?: { signal?: AbortSignal }) => Promise<NodeJS.ReadableStream | null>
  mkDir: (path: string, opts?: { signal?: AbortSignal }) => Promise<void>
  domain: (port: number) => string
  [Symbol.asyncDispose]: () => Promise<void>
}

export interface VercelCommandResult {
  exitCode: number
  stdout: () => Promise<string>
  stderr: () => Promise<string>
  logs: () => AsyncGenerator<{ stream: 'stdout' | 'stderr', data: string }>
  kill: () => Promise<void>
  wait: () => Promise<{ exitCode: number }>
}

export interface VercelSandboxSDK {
  Sandbox: {
    create: (options: VercelCreateOptions) => Promise<VercelSandboxInstance>
    list: () => Promise<{ sandboxes: VercelSandboxListItem[] }>
    get: (id: string) => Promise<VercelSandboxInstance | null>
  }
}

export interface VercelCreateOptions {
  runtime: string
  timeout?: number
  resources?: { vcpus?: number }
  ports?: number[]
}

export interface VercelSandboxListItem {
  id: string
  status: string
  createdAt: string
}

// === Vercel Namespace ===
export interface VercelSnapshot {
  id: string
  sandboxId: string
  createdAt: string
}

export interface NetworkPolicy {
  allowInternet?: boolean
  allowedHosts?: string[]
  blockedHosts?: string[]
}

export interface VercelSandboxMetadata {
  id: string
  runtime: string
  status: string
  createdAt: string
}

export interface VercelNamespace {
  readonly native: VercelSandboxInstance
  snapshot: () => Promise<VercelSnapshot>
  getSnapshot: (id: string) => Promise<VercelSnapshot>
  listSnapshots: () => Promise<{ snapshots: VercelSnapshot[] }>
  deleteSnapshot: (id: string) => Promise<void>
  domain: (port: number) => string
  extendTimeout: (durationMs: number) => Promise<void>
  updateNetworkPolicy: (policy: NetworkPolicy) => Promise<void>
  getMetadata: () => VercelSandboxMetadata
}

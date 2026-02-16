import type { CloudflareSandboxNamespace } from './cloudflare'
import type { SandboxCapabilities, SandboxExecOptions, SandboxExecResult, SandboxFileEntry, SandboxListFilesOptions, SandboxProcess, SandboxProcessOptions, SandboxProvider } from './common'
import type { DenoSandboxNamespace } from './deno'
import type { VercelSandboxNamespace } from './vercel'

export type * from './cloudflare'
export type * from './common'
export type * from './deno'
export type * from './vercel'

export interface SandboxClient<P extends SandboxProvider = SandboxProvider> {
  readonly id: string
  readonly provider: P
  readonly supports: SandboxCapabilities

  exec: (cmd: string, args?: string[], opts?: SandboxExecOptions) => Promise<SandboxExecResult>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  stop: () => Promise<void>

  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>
  readFileStream: (path: string) => Promise<ReadableStream<Uint8Array>>
  startProcess: (cmd: string, args?: string[], opts?: SandboxProcessOptions) => Promise<SandboxProcess>

  listFiles: (path: string, opts?: SandboxListFilesOptions) => Promise<SandboxFileEntry[]>
  exists: (path: string) => Promise<boolean>
  deleteFile: (path: string) => Promise<void>
  moveFile: (src: string, dst: string) => Promise<void>

  readonly vercel: P extends 'vercel' ? VercelSandboxNamespace : never
  readonly cloudflare: P extends 'cloudflare' ? CloudflareSandboxNamespace : never
  readonly deno: P extends 'deno' ? DenoSandboxNamespace : never
}

export type VercelSandboxClient = SandboxClient<'vercel'>
export type CloudflareSandboxClient = SandboxClient<'cloudflare'>
export type DenoSandboxClient = SandboxClient<'deno'>

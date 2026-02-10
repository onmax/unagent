import type { CloudflareSandboxNamespace } from './cloudflare'
import type { SandboxCapabilities, SandboxExecOptions, SandboxExecResult, SandboxFileEntry, SandboxListFilesOptions, SandboxProcess, SandboxProcessOptions, SandboxProvider } from './common'
import type { DenoSandboxNamespace } from './deno'
import type { VercelSandboxNamespace } from './vercel'

export type * from './cloudflare'
export type * from './common'
export type * from './deno'
export type * from './vercel'

// === Unified Sandbox Interface ===
export interface SandboxClient<P extends SandboxProvider = SandboxProvider> {
  readonly id: string
  readonly provider: P
  readonly supports: SandboxCapabilities

  // === Core (both platforms) ===
  exec: (cmd: string, args?: string[], opts?: SandboxExecOptions) => Promise<SandboxExecResult>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  stop: () => Promise<void>

  // === New unified (both platforms) ===
  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>
  readFileStream: (path: string) => Promise<ReadableStream<Uint8Array>>
  startProcess: (cmd: string, args?: string[], opts?: SandboxProcessOptions) => Promise<SandboxProcess>

  // === Unified (CF full support, Vercel throws NotSupportedError) ===
  listFiles: (path: string, opts?: SandboxListFilesOptions) => Promise<SandboxFileEntry[]>
  exists: (path: string) => Promise<boolean>
  deleteFile: (path: string) => Promise<void>
  moveFile: (src: string, dst: string) => Promise<void>

  // === Platform namespaces ===
  readonly vercel: P extends 'vercel' ? VercelSandboxNamespace : never
  readonly cloudflare: P extends 'cloudflare' ? CloudflareSandboxNamespace : never
  readonly deno: P extends 'deno' ? DenoSandboxNamespace : never
}

// === Typed sandbox aliases ===
export type VercelSandboxClient = SandboxClient<'vercel'>
export type CloudflareSandboxClient = SandboxClient<'cloudflare'>
export type DenoSandboxClient = SandboxClient<'deno'>

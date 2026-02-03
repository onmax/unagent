export type * from './common'
export type * from './vercel'
export type * from './cloudflare'

import type { CloudflareNamespace } from './cloudflare'
import type { SandboxCapabilities, SandboxExecOptions, FileEntry, ListFilesOptions, ProcessOptions, SandboxExecResult, SandboxProcess, SandboxProvider } from './common'
import type { VercelNamespace } from './vercel'

// === Unified Sandbox Interface ===
export interface Sandbox<P extends SandboxProvider = SandboxProvider> {
  readonly id: string
  readonly provider: P
  readonly supports: SandboxCapabilities

  // === Core (both platforms) ===
  exec(cmd: string, args?: string[], opts?: SandboxExecOptions): Promise<SandboxExecResult>
  writeFile(path: string, content: string): Promise<void>
  readFile(path: string): Promise<string>
  stop(): Promise<void>

  // === New unified (both platforms) ===
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>
  readFileStream(path: string): Promise<ReadableStream<Uint8Array>>
  startProcess(cmd: string, args?: string[], opts?: ProcessOptions): Promise<SandboxProcess>

  // === Unified (CF full support, Vercel throws NotSupportedError) ===
  listFiles(path: string, opts?: ListFilesOptions): Promise<FileEntry[]>
  exists(path: string): Promise<boolean>
  deleteFile(path: string): Promise<void>
  moveFile(src: string, dst: string): Promise<void>

  // === Platform namespaces ===
  readonly vercel: P extends 'vercel' ? VercelNamespace : never
  readonly cloudflare: P extends 'cloudflare' ? CloudflareNamespace : never
}

// === Typed sandbox aliases ===
export type VercelSandbox = Sandbox<'vercel'>
export type CloudflareSandbox = Sandbox<'cloudflare'>

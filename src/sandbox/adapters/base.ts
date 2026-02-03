import type { CloudflareNamespace } from '../types/cloudflare'
import type { SandboxCapabilities, SandboxExecOptions, FileEntry, ListFilesOptions, ProcessOptions, SandboxExecResult, SandboxProcess, SandboxProvider } from '../types/common'
import type { VercelNamespace } from '../types/vercel'
import type { Sandbox } from '../types/index'
import { NotSupportedError } from '../errors'

export abstract class BaseSandboxAdapter<P extends SandboxProvider = SandboxProvider> implements Sandbox<P> {
  abstract readonly id: string
  abstract readonly provider: P
  abstract readonly supports: SandboxCapabilities

  // === Core methods (must implement) ===
  abstract exec(cmd: string, args?: string[], opts?: SandboxExecOptions): Promise<SandboxExecResult>
  abstract writeFile(path: string, content: string): Promise<void>
  abstract readFile(path: string): Promise<string>
  abstract stop(): Promise<void>

  // === New unified methods ===
  abstract mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>
  abstract readFileStream(path: string): Promise<ReadableStream<Uint8Array>>
  abstract startProcess(cmd: string, args?: string[], opts?: ProcessOptions): Promise<SandboxProcess>

  // === CF-only methods (default throws) ===
  async listFiles(_path: string, _opts?: ListFilesOptions): Promise<FileEntry[]> {
    throw new NotSupportedError('listFiles', this.provider)
  }

  async exists(_path: string): Promise<boolean> {
    throw new NotSupportedError('exists', this.provider)
  }

  async deleteFile(_path: string): Promise<void> {
    throw new NotSupportedError('deleteFile', this.provider)
  }

  async moveFile(_src: string, _dst: string): Promise<void> {
    throw new NotSupportedError('moveFile', this.provider)
  }

  // === Platform namespaces ===
  get vercel(): P extends 'vercel' ? VercelNamespace : never {
    throw new NotSupportedError('vercel namespace', this.provider)
  }

  get cloudflare(): P extends 'cloudflare' ? CloudflareNamespace : never {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }
}

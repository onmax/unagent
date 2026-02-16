import type { CloudflareSandboxNamespace } from '../types/cloudflare'
import type { SandboxCapabilities, SandboxExecOptions, SandboxExecResult, SandboxFileEntry, SandboxListFilesOptions, SandboxProcess, SandboxProcessOptions, SandboxProvider } from '../types/common'
import type { DenoSandboxNamespace } from '../types/deno'
import type { SandboxClient } from '../types/index'
import type { VercelSandboxNamespace } from '../types/vercel'
import { NotSupportedError } from '../errors'

export abstract class BaseSandboxAdapter<P extends SandboxProvider = SandboxProvider> implements SandboxClient<P> {
  abstract readonly id: string
  abstract readonly provider: P
  abstract readonly supports: SandboxCapabilities

  abstract exec(cmd: string, args?: string[], opts?: SandboxExecOptions): Promise<SandboxExecResult>
  abstract writeFile(path: string, content: string): Promise<void>
  abstract readFile(path: string): Promise<string>
  abstract stop(): Promise<void>

  abstract mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>
  abstract readFileStream(path: string): Promise<ReadableStream<Uint8Array>>
  abstract startProcess(cmd: string, args?: string[], opts?: SandboxProcessOptions): Promise<SandboxProcess>

  async listFiles(_path: string, _opts?: SandboxListFilesOptions): Promise<SandboxFileEntry[]> {
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

  get vercel(): P extends 'vercel' ? VercelSandboxNamespace : never {
    throw new NotSupportedError('vercel namespace', this.provider)
  }

  get cloudflare(): P extends 'cloudflare' ? CloudflareSandboxNamespace : never {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }

  get deno(): P extends 'deno' ? DenoSandboxNamespace : never {
    throw new NotSupportedError('deno namespace', this.provider)
  }
}

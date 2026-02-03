import type { CloudflareNamespace, CloudflareSession, CodeContext, CodeContextOptions, CodeExecutionResult, ExposePortOptions, ExposedPort, GitCheckoutOptions, GitCheckoutResult, MountBucketOptions, RunCodeOptions, SessionOptions } from '../types/cloudflare'
import type { CloudflareSandboxStub, SandboxCapabilities, SandboxExecOptions, FileEntry, ListFilesOptions, ProcessOptions, SandboxExecResult, SandboxProcess, WaitForPortOptions } from '../types/common'
import { NotSupportedError, SandboxError } from '../errors'
import { shellQuote } from '../utils'
import { BaseSandboxAdapter } from './base'

class CloudflareProcessHandle implements SandboxProcess {
  readonly id: string
  readonly command: string
  private processInfo: {
    kill: (signal?: string) => Promise<void>
    logs: () => Promise<{ stdout: string; stderr: string }>
    wait: (timeout?: number) => Promise<{ exitCode: number }>
    waitForLog?: (pattern: string | RegExp, timeout?: number) => Promise<{ line: string }>
    waitForPort?: (port: number, opts?: { timeout?: number; hostname?: string }) => Promise<void>
  }

  constructor(id: string, command: string, processInfo: CloudflareProcessHandle['processInfo']) {
    this.id = id
    this.command = command
    this.processInfo = processInfo
  }

  async kill(signal?: string): Promise<void> {
    await this.processInfo.kill(signal)
  }

  async logs(): Promise<{ stdout: string; stderr: string }> {
    return this.processInfo.logs()
  }

  async wait(timeout?: number): Promise<{ exitCode: number }> {
    return this.processInfo.wait(timeout)
  }

  async waitForLog(pattern: string | RegExp, timeout = 30_000): Promise<{ line: string }> {
    if (this.processInfo.waitForLog) {
      try {
        return await this.processInfo.waitForLog(pattern, timeout)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const canFallback = /ProcessExitedBeforeReadyError|before becoming ready|exited with code/i.test(message)
        if (!canFallback) {
          throw error
        }
      }
    }
    // Fallback: poll logs
    const startTime = Date.now()
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern)
      : new RegExp(pattern.source, pattern.flags.replace(/g/g, ''))
    while (Date.now() - startTime < timeout) {
      const { stdout, stderr } = await this.logs()
      const combined = stdout + stderr
      for (const line of combined.split('\n')) {
        if (regex.test(line)) {
          return { line }
        }
      }
      await new Promise(r => setTimeout(r, 100))
    }
    throw new SandboxError(`Timeout waiting for log pattern: ${pattern}`, 'TIMEOUT')
  }

  async waitForPort(port: number, opts?: WaitForPortOptions): Promise<void> {
    if (this.processInfo.waitForPort) {
      await this.processInfo.waitForPort(port, opts)
      return
    }
    // Fallback: poll with nc
    const timeout = opts?.timeout ?? 30_000
    const hostname = opts?.hostname ?? 'localhost'
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1000)
        await fetch(`http://${hostname}:${port}`, { signal: controller.signal })
        clearTimeout(timeoutId)
        return
      }
      catch {
        await new Promise(r => setTimeout(r, 100))
      }
    }
    throw new SandboxError(`Timeout waiting for port ${port}`, 'TIMEOUT')
  }
}

class CloudflareNamespaceImpl implements CloudflareNamespace {
  readonly native: CloudflareSandboxStub
  private stub: CloudflareSandboxStub

  constructor(stub: CloudflareSandboxStub) {
    this.native = stub
    this.stub = stub
  }

  async gitCheckout(_url: string, _opts?: GitCheckoutOptions): Promise<GitCheckoutResult> {
    // The CF sandbox SDK should expose this - for now delegate to stub if available
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.gitCheckout === 'function') {
      return stubAny.gitCheckout(_url, _opts) as Promise<GitCheckoutResult>
    }
    throw new NotSupportedError('gitCheckout', 'cloudflare')
  }

  async createSession(_opts?: SessionOptions): Promise<CloudflareSession> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.createSession === 'function') {
      return stubAny.createSession(_opts) as Promise<CloudflareSession>
    }
    throw new NotSupportedError('createSession', 'cloudflare')
  }

  async getSession(_id: string): Promise<CloudflareSession> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.getSession === 'function') {
      return stubAny.getSession(_id) as Promise<CloudflareSession>
    }
    throw new NotSupportedError('getSession', 'cloudflare')
  }

  async deleteSession(_id: string): Promise<void> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.deleteSession === 'function') {
      await (stubAny.deleteSession as (id: string) => Promise<void>)(_id)
      return
    }
    throw new NotSupportedError('deleteSession', 'cloudflare')
  }

  async createCodeContext(_opts?: CodeContextOptions): Promise<CodeContext> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.createCodeContext === 'function') {
      return stubAny.createCodeContext(_opts) as Promise<CodeContext>
    }
    throw new NotSupportedError('createCodeContext', 'cloudflare')
  }

  async runCode(_code: string, _opts?: RunCodeOptions): Promise<CodeExecutionResult> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.runCode === 'function') {
      return stubAny.runCode(_code, _opts) as Promise<CodeExecutionResult>
    }
    throw new NotSupportedError('runCode', 'cloudflare')
  }

  async listCodeContexts(): Promise<CodeContext[]> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.listCodeContexts === 'function') {
      return stubAny.listCodeContexts() as Promise<CodeContext[]>
    }
    throw new NotSupportedError('listCodeContexts', 'cloudflare')
  }

  async deleteCodeContext(_id: string): Promise<void> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.deleteCodeContext === 'function') {
      await (stubAny.deleteCodeContext as (id: string) => Promise<void>)(_id)
      return
    }
    throw new NotSupportedError('deleteCodeContext', 'cloudflare')
  }

  async exposePort(_port: number, _opts?: ExposePortOptions): Promise<{ url: string }> {
    if (!_opts?.hostname) {
      throw new SandboxError('Cloudflare exposePort() requires opts.hostname. Use a custom domain (not *.workers.dev).', 'INVALID_ARGUMENT')
    }
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.exposePort === 'function') {
      return stubAny.exposePort(_port, _opts) as Promise<{ url: string }>
    }
    throw new NotSupportedError('exposePort', 'cloudflare')
  }

  async unexposePort(_port: number): Promise<void> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.unexposePort === 'function') {
      await (stubAny.unexposePort as (port: number) => Promise<void>)(_port)
      return
    }
    throw new NotSupportedError('unexposePort', 'cloudflare')
  }

  async getExposedPorts(_hostname?: string): Promise<ExposedPort[]> {
    if (!_hostname) {
      throw new SandboxError('Cloudflare getExposedPorts() requires a hostname argument. Use your custom domain hostname.', 'INVALID_ARGUMENT')
    }
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.getExposedPorts === 'function') {
      return stubAny.getExposedPorts(_hostname) as Promise<ExposedPort[]>
    }
    throw new NotSupportedError('getExposedPorts', 'cloudflare')
  }

  async mountBucket(_bucket: string, _path: string, _opts?: MountBucketOptions): Promise<void> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.mountBucket === 'function') {
      await (stubAny.mountBucket as (bucket: string, path: string, opts?: MountBucketOptions) => Promise<void>)(_bucket, _path, _opts)
      return
    }
    throw new NotSupportedError('mountBucket', 'cloudflare')
  }

  async unmountBucket(_path: string): Promise<void> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.unmountBucket === 'function') {
      await (stubAny.unmountBucket as (path: string) => Promise<void>)(_path)
      return
    }
    throw new NotSupportedError('unmountBucket', 'cloudflare')
  }

  async setEnvVars(_vars: Record<string, string | undefined>): Promise<void> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.setEnvVars === 'function') {
      await (stubAny.setEnvVars as (vars: Record<string, string | undefined>) => Promise<void>)(_vars)
      return
    }
    throw new NotSupportedError('setEnvVars', 'cloudflare')
  }

  async wsConnect(_request: Request, _port: number): Promise<Response> {
    const stubAny = this.stub as unknown as Record<string, unknown>
    if (typeof stubAny.wsConnect === 'function') {
      return stubAny.wsConnect(_request, _port) as Promise<Response>
    }
    throw new NotSupportedError('wsConnect', 'cloudflare')
  }
}

export class CloudflareSandboxAdapter extends BaseSandboxAdapter<'cloudflare'> {
  readonly id: string
  readonly provider = 'cloudflare' as const
  get supports(): SandboxCapabilities {
    return {
      execEnv: true,
      execCwd: true,
      execSudo: false,
      listFiles: true,
      exists: true,
      deleteFile: true,
      moveFile: true,
      readFileStream: true,
      startProcess: !!this.stub.startProcess,
    }
  }
  private stub: CloudflareSandboxStub
  private _cloudflare?: CloudflareNamespace

  constructor(id: string, stub: CloudflareSandboxStub) {
    super()
    this.id = id
    this.stub = stub
  }

  override get cloudflare(): CloudflareNamespace {
    if (!this._cloudflare) {
      this._cloudflare = new CloudflareNamespaceImpl(this.stub)
    }
    return this._cloudflare
  }

  async exec(command: string, args: string[] = [], opts?: SandboxExecOptions): Promise<SandboxExecResult> {
    const cmd = args.length ? `${shellQuote(command)} ${args.map(shellQuote).join(' ')}` : shellQuote(command)
    const result = await this.stub.exec(cmd, {
      timeout: opts?.timeout,
      env: opts?.env,
      cwd: opts?.cwd,
      stream: !!(opts?.onStdout || opts?.onStderr),
      onOutput: (opts?.onStdout || opts?.onStderr) ? (data, stream) => {
        if (stream === 'stdout' && opts?.onStdout) opts.onStdout(data)
        if (stream === 'stderr' && opts?.onStderr) opts.onStderr(data)
      } : undefined,
    })
    return { ok: result.success, stdout: result.stdout, stderr: result.stderr, code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const result = await this.stub.writeFile(path, content)
    if (!result.success)
      throw new SandboxError(`Failed to write file: ${path}`)
  }

  async readFile(path: string): Promise<string> {
    const result = await this.stub.readFile(path)
    if (!result.success)
      throw new SandboxError(`Failed to read file: ${path}`)
    return result.content
  }

  async stop(): Promise<void> {
    await this.stub.destroy()
  }

  async mkdir(path: string, opts?: { recursive?: boolean }): Promise<void> {
    if (this.stub.mkdir) {
      const result = await this.stub.mkdir(path, opts)
      if (!result.success)
        throw new SandboxError(`Failed to create directory: ${path}`)
      return
    }
    // Fallback: use exec
    const flags = opts?.recursive ? '-p' : ''
    const result = await this.exec('mkdir', flags ? [flags, path] : [path])
    if (!result.ok)
      throw new SandboxError(`Failed to create directory: ${path}. ${result.stderr}`)
  }

  async readFileStream(path: string): Promise<ReadableStream<Uint8Array>> {
    if (this.stub.readFileStream) {
      return this.stub.readFileStream(path)
    }
    // Fallback: read full file and create stream
    const content = await this.readFile(path)
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(content))
        controller.close()
      },
    })
  }

  async startProcess(cmd: string, args: string[] = [], opts?: ProcessOptions): Promise<SandboxProcess> {
    if (!this.stub.startProcess)
      throw new NotSupportedError('startProcess', 'cloudflare')

    const processInfo = await this.stub.startProcess(cmd, args, opts)
    const processAny = processInfo as unknown as Record<string, unknown>
    const logs = typeof processAny.logs === 'function'
      ? () => (processAny.logs as () => Promise<{ stdout: string; stderr: string }>)()
      : typeof processAny.getLogs === 'function'
        ? () => (processAny.getLogs as () => Promise<{ stdout: string; stderr: string }>)()
        : undefined
    const wait = typeof processAny.wait === 'function'
      ? (timeout?: number) => (processAny.wait as (timeout?: number) => Promise<{ exitCode: number }>)(timeout)
      : typeof processAny.waitForExit === 'function'
        ? (timeout?: number) => (processAny.waitForExit as (timeout?: number) => Promise<{ exitCode: number }>)(timeout)
        : undefined

    if (!logs || !wait) {
      throw new SandboxError('Cloudflare process handle does not provide logs()/wait() compatibility methods', 'NOT_SUPPORTED')
    }

    return new CloudflareProcessHandle(processInfo.id, processInfo.command, {
      kill: processInfo.kill,
      logs,
      wait,
      waitForLog: processInfo.waitForLog,
      waitForPort: processInfo.waitForPort,
    })
  }

  override async listFiles(path: string, opts?: ListFilesOptions): Promise<FileEntry[]> {
    if (this.stub.listFiles) {
      const result = await this.stub.listFiles(path, opts)
      return result.files.map(f => ({ name: f.name, path: f.path, type: f.type, size: f.size, mtime: f.mtime }))
    }
    // Fallback: use ls
    const flags = opts?.recursive ? '-laR' : '-la'
    const result = await this.exec('ls', [flags, path])
    if (!result.ok)
      throw new SandboxError(`Failed to list files: ${path}. ${result.stderr}`)
    // Parse ls output (simplified)
    return result.stdout.split('\n').filter(Boolean).slice(1).map(line => {
      const parts = line.split(/\s+/)
      const name = parts[parts.length - 1] || ''
      const isDir = line.startsWith('d')
      return { name, path: `${path}/${name}`, type: (isDir ? 'directory' : 'file') as 'file' | 'directory' }
    }).filter(f => f.name && f.name !== '.' && f.name !== '..')
  }

  override async exists(path: string): Promise<boolean> {
    if (this.stub.exists) {
      const result = await this.stub.exists(path)
      return result.exists
    }
    // Fallback: try to read
    try {
      await this.exec('test', ['-e', path])
      return true
    }
    catch {
      return false
    }
  }

  override async deleteFile(path: string): Promise<void> {
    if (this.stub.deleteFile) {
      const result = await this.stub.deleteFile(path)
      if (!result.success)
        throw new SandboxError(`Failed to delete file: ${path}`)
      return
    }
    // Fallback: use rm
    const result = await this.exec('rm', ['-f', path])
    if (!result.ok)
      throw new SandboxError(`Failed to delete file: ${path}. ${result.stderr}`)
  }

  override async moveFile(src: string, dst: string): Promise<void> {
    if (this.stub.moveFile) {
      const result = await this.stub.moveFile(src, dst)
      if (!result.success)
        throw new SandboxError(`Failed to move file: ${src} -> ${dst}`)
      return
    }
    // Fallback: use mv
    const result = await this.exec('mv', [src, dst])
    if (!result.ok)
      throw new SandboxError(`Failed to move file: ${src} -> ${dst}. ${result.stderr}`)
  }
}

import type { SandboxExecOptions, SandboxExecResult, SandboxProcess, SandboxProcessOptions, SandboxWaitForPortOptions } from '../types/common'
import type { SandboxNetworkPolicy, VercelSandboxCommandResult, VercelSandboxInstance, VercelSandboxMetadata, VercelSandboxNamespace, VercelSandboxSnapshot } from '../types/vercel'
import { Buffer } from 'node:buffer'
import { Readable, Writable } from 'node:stream'
import { NotSupportedError, SandboxError } from '../errors'
import { BaseSandboxAdapter } from './base'

class VercelProcessHandle implements SandboxProcess {
  readonly id: string
  readonly command: string
  private cmdResult: VercelSandboxCommandResult
  private collectedStdout = ''
  private collectedStderr = ''
  private logsGenerator?: AsyncGenerator<{ stream: 'stdout' | 'stderr', data: string }>
  private logsPump?: Promise<void>
  private logsPumpDone = false
  private logsPumpError?: unknown
  private logEventWaiters: Array<() => void> = []
  private resolvePortUrl?: (port: number) => string

  constructor(id: string, command: string, cmdResult: VercelSandboxCommandResult, resolvePortUrl?: (port: number) => string) {
    this.id = id
    this.command = command
    this.cmdResult = cmdResult
    this.resolvePortUrl = resolvePortUrl
  }

  async kill(_signal?: string): Promise<void> {
    await this.cmdResult.kill()
  }

  private notifyLogEvent(): void {
    const waiters = this.logEventWaiters.splice(0, this.logEventWaiters.length)
    for (const waiter of waiters) {
      waiter()
    }
  }

  private startLogsPump(): void {
    if (this.logsPump) {
      return
    }

    if (!this.logsGenerator) {
      this.logsGenerator = this.cmdResult.logs()
    }

    this.logsPump = (async () => {
      try {
        for await (const log of this.logsGenerator!) {
          if (log.stream === 'stdout') {
            this.collectedStdout += log.data
          }
          else {
            this.collectedStderr += log.data
          }
          this.notifyLogEvent()
        }
      }
      catch (error) {
        this.logsPumpError = error
      }
      finally {
        this.logsPumpDone = true
        this.notifyLogEvent()
      }
    })()
  }

  private async waitForLogEvent(timeoutMs: number): Promise<boolean> {
    if (timeoutMs <= 0 || this.logsPumpDone) {
      return false
    }

    return new Promise<boolean>((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout>

      const onEvent = (): void => {
        clearTimeout(timeoutId)
        this.logEventWaiters = this.logEventWaiters.filter(waiter => waiter !== onEvent)
        resolve(true)
      }

      timeoutId = setTimeout(() => {
        this.logEventWaiters = this.logEventWaiters.filter(waiter => waiter !== onEvent)
        resolve(false)
      }, timeoutMs)

      this.logEventWaiters.push(onEvent)
    })
  }

  private findMatchingLine(regex: RegExp): string | undefined {
    const combined = `${this.collectedStdout}\n${this.collectedStderr}`
    for (const line of combined.split('\n')) {
      if (regex.test(line)) {
        return line
      }
    }
    return undefined
  }

  async logs(): Promise<{ stdout: string, stderr: string }> {
    this.startLogsPump()
    await this.waitForLogEvent(10)
    return { stdout: this.collectedStdout, stderr: this.collectedStderr }
  }

  async wait(timeout?: number): Promise<{ exitCode: number }> {
    const waitResult = timeout
      ? await Promise.race([
          this.cmdResult.wait(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new SandboxError('Process wait timeout', 'TIMEOUT')), timeout)),
        ])
      : await this.cmdResult.wait()

    const rawExitCode = (waitResult as { exitCode?: unknown })?.exitCode
    const exitCode = typeof rawExitCode === 'number' ? rawExitCode : 0
    return { exitCode }
  }

  async waitForLog(pattern: string | RegExp, timeout = 30_000): Promise<{ line: string }> {
    const startTime = Date.now()
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern)
      : new RegExp(pattern.source, pattern.flags.replace(/g/g, ''))

    this.startLogsPump()
    let matchedLine = this.findMatchingLine(regex)
    if (matchedLine) {
      return { line: matchedLine }
    }

    while (Date.now() - startTime < timeout) {
      if (this.logsPumpError) {
        throw this.logsPumpError
      }

      if (this.logsPumpDone) {
        throw new SandboxError(`Process exited before log pattern was found: ${pattern}`, 'PROCESS_EXITED')
      }

      const remaining = timeout - (Date.now() - startTime)
      await this.waitForLogEvent(Math.min(remaining, 200))
      matchedLine = this.findMatchingLine(regex)
      if (matchedLine) {
        return { line: matchedLine }
      }
    }

    if (this.logsPumpError) {
      throw this.logsPumpError
    }

    throw new SandboxError(`Timeout waiting for log pattern: ${pattern}`, 'TIMEOUT')
  }

  async waitForPort(port: number, opts?: SandboxWaitForPortOptions): Promise<void> {
    const timeout = opts?.timeout ?? 30_000
    const hostname = opts?.hostname ?? 'localhost'
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1000)
        let url: string
        if (opts?.hostname) {
          url = hostname.includes('://') ? hostname : `http://${hostname}:${port}`
        }
        else if (this.resolvePortUrl) {
          try {
            url = this.resolvePortUrl(port)
          }
          catch {
            url = `http://${hostname}:${port}`
          }
        }
        else {
          url = `http://${hostname}:${port}`
        }
        await fetch(url, { signal: controller.signal })
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

class VercelNamespaceImpl implements VercelSandboxNamespace {
  readonly native: VercelSandboxInstance
  private instance: VercelSandboxInstance
  private sandboxId: string
  private _metadata: { runtime: string, createdAt: string }

  constructor(instance: VercelSandboxInstance, sandboxId: string, metadata: { runtime: string, createdAt: string }) {
    this.native = instance
    this.instance = instance
    this.sandboxId = sandboxId
    this._metadata = metadata
  }

  async snapshot(): Promise<VercelSandboxSnapshot> {
    const instanceAny = this.instance as unknown as Record<string, unknown>
    if (typeof instanceAny.snapshot === 'function') {
      return instanceAny.snapshot() as Promise<VercelSandboxSnapshot>
    }
    throw new NotSupportedError('snapshot', 'vercel')
  }

  async getSnapshot(id: string): Promise<VercelSandboxSnapshot> {
    const instanceAny = this.instance as unknown as Record<string, unknown>
    if (typeof instanceAny.getSnapshot === 'function') {
      return instanceAny.getSnapshot(id) as Promise<VercelSandboxSnapshot>
    }
    throw new NotSupportedError('getSnapshot', 'vercel')
  }

  async listSnapshots(): Promise<{ snapshots: VercelSandboxSnapshot[] }> {
    const instanceAny = this.instance as unknown as Record<string, unknown>
    if (typeof instanceAny.listSnapshots === 'function') {
      return instanceAny.listSnapshots() as Promise<{ snapshots: VercelSandboxSnapshot[] }>
    }
    throw new NotSupportedError('listSnapshots', 'vercel')
  }

  async deleteSnapshot(id: string): Promise<void> {
    const instanceAny = this.instance as unknown as Record<string, unknown>
    if (typeof instanceAny.deleteSnapshot === 'function') {
      await (instanceAny.deleteSnapshot as (id: string) => Promise<void>)(id)
      return
    }
    throw new NotSupportedError('deleteSnapshot', 'vercel')
  }

  domain(port: number): string {
    const instanceAny = this.instance as unknown as Record<string, unknown>
    if (typeof instanceAny.domain === 'function') {
      return (instanceAny.domain as (port: number) => string)(port)
    }
    // Fallback: construct URL based on sandbox ID
    return `https://${this.sandboxId}-${port}.sandbox.vercel.app`
  }

  async extendTimeout(durationMs: number): Promise<void> {
    const instanceAny = this.instance as unknown as Record<string, unknown>
    if (typeof instanceAny.extendTimeout === 'function') {
      await (instanceAny.extendTimeout as (durationMs: number) => Promise<void>)(durationMs)
      return
    }
    throw new NotSupportedError('extendTimeout', 'vercel')
  }

  async updateNetworkPolicy(policy: SandboxNetworkPolicy): Promise<void> {
    const instanceAny = this.instance as unknown as Record<string, unknown>
    if (typeof instanceAny.updateNetworkPolicy === 'function') {
      await (instanceAny.updateNetworkPolicy as (policy: SandboxNetworkPolicy) => Promise<void>)(policy)
      return
    }
    throw new NotSupportedError('updateNetworkPolicy', 'vercel')
  }

  getMetadata(): VercelSandboxMetadata {
    return {
      id: this.sandboxId,
      runtime: this._metadata.runtime,
      status: 'running',
      createdAt: this._metadata.createdAt,
    }
  }
}

export class VercelSandboxAdapter extends BaseSandboxAdapter<'vercel'> {
  readonly id: string
  readonly provider = 'vercel' as const
  readonly supports = {
    execEnv: true,
    execCwd: true,
    execSudo: true,
    listFiles: false,
    exists: false,
    deleteFile: false,
    moveFile: false,
    readFileStream: true,
    startProcess: true,
  }

  private instance: VercelSandboxInstance
  private _vercel?: VercelSandboxNamespace
  private metadata: { runtime: string, createdAt: string }

  constructor(id: string, instance: VercelSandboxInstance, metadata: { runtime: string, createdAt: string }) {
    super()
    this.id = id
    this.instance = instance
    this.metadata = metadata
  }

  override get vercel(): VercelSandboxNamespace {
    if (!this._vercel) {
      this._vercel = new VercelNamespaceImpl(this.instance, this.id, this.metadata)
    }
    return this._vercel
  }

  async exec(command: string, args: string[] = [], opts?: SandboxExecOptions): Promise<SandboxExecResult> {
    const params = {
      cmd: command,
      args,
      cwd: opts?.cwd,
      env: opts?.env,
      sudo: opts?.sudo,
    }

    if (opts?.onStdout || opts?.onStderr) {
      const stdoutChunks: string[] = []
      const stderrChunks: string[] = []

      const stdoutStream = new Writable({
        write(chunk, _enc, cb) {
          const data = typeof chunk === 'string' ? chunk : chunk.toString()
          stdoutChunks.push(data)
          opts.onStdout?.(data)
          cb()
        },
      })

      const stderrStream = new Writable({
        write(chunk, _enc, cb) {
          const data = typeof chunk === 'string' ? chunk : chunk.toString()
          stderrChunks.push(data)
          opts.onStderr?.(data)
          cb()
        },
      })

      const result = await this.instance.runCommand({ ...params, stdout: stdoutStream, stderr: stderrStream })
      return { ok: result.exitCode === 0, stdout: stdoutChunks.join(''), stderr: stderrChunks.join(''), code: result.exitCode }
    }

    const result = await this.instance.runCommand(params)
    const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()])
    return { ok: result.exitCode === 0, stdout, stderr, code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.instance.writeFiles([{ path, content: Buffer.from(content) }])
  }

  async readFile(path: string): Promise<string> {
    const buffer = await this.instance.readFileToBuffer({ path })
    if (!buffer)
      throw new SandboxError(`Failed to read file: ${path}`)
    return Buffer.from(buffer).toString()
  }

  async stop(): Promise<void> {
    await this.instance[Symbol.asyncDispose]()
  }

  async mkdir(path: string, opts?: { recursive?: boolean }): Promise<void> {
    if (opts?.recursive) {
      const result = await this.exec('mkdir', ['-p', path])
      if (!result.ok)
        throw new SandboxError(`Failed to create directory: ${path}. ${result.stderr}`)
      return
    }
    await this.instance.mkDir(path)
  }

  async readFileStream(path: string): Promise<ReadableStream<Uint8Array>> {
    const stream = await this.instance.readFile({ path })
    if (!stream)
      throw new SandboxError(`Failed to read file: ${path}`)
    return Readable.toWeb(stream) as ReadableStream<Uint8Array>
  }

  async startProcess(cmd: string, args: string[] = [], opts?: SandboxProcessOptions): Promise<SandboxProcess> {
    const processId = `vercel-proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const cmdResult = await this.instance.runCommand({
      cmd,
      args,
      cwd: opts?.cwd,
      env: opts?.env,
      detached: true,
    })
    const handle = new VercelProcessHandle(processId, `${cmd} ${args.join(' ')}`, cmdResult, port => this.vercel.domain(port))
    return handle
  }
}

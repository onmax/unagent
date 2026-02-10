import type { SandboxCapabilities, SandboxExecOptions, SandboxExecResult, SandboxFileEntry, SandboxListFilesOptions, SandboxProcess, SandboxProcessOptions, SandboxWaitForPortOptions } from '../types/common'
import type { DenoSandboxChildProcess, DenoSandboxInstance, DenoSandboxNamespace, DenoSandboxSpawnOptions, DenoSandboxVsCode, DenoSandboxVsCodeOptions, SandboxDeno, SandboxEnv, SandboxFs } from '../types/deno'
import { NotSupportedError, SandboxError } from '../errors'
import { BaseSandboxAdapter } from './base'

async function readStream(stream: ReadableStream<Uint8Array>, onChunk?: (chunk: string) => void): Promise<{ text: string }> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    if (value) {
      const chunk = decoder.decode(value, { stream: true })
      text += chunk
      if (onChunk)
        onChunk(chunk)
    }
  }
  text += decoder.decode()
  return { text }
}

class DenoProcessHandle implements SandboxProcess {
  readonly id: string
  readonly command: string
  private process: DenoSandboxChildProcess
  private sandbox: DenoSandboxInstance
  private stdout = ''
  private stderr = ''
  private logsPump?: Promise<void>
  private logsPumpDone = false
  private logsPumpError?: unknown
  private logEventWaiters: Array<() => void> = []

  constructor(id: string, command: string, process: DenoSandboxChildProcess, sandbox: DenoSandboxInstance) {
    this.id = id
    this.command = command
    this.process = process
    this.sandbox = sandbox
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

    const stdoutStream = this.process.stdout
    const stderrStream = this.process.stderr

    this.logsPump = (async () => {
      try {
        const tasks: Promise<void>[] = []
        if (stdoutStream) {
          tasks.push(readStream(stdoutStream, (chunk) => {
            this.stdout += chunk
            this.notifyLogEvent()
          }).then(() => {}))
        }
        if (stderrStream) {
          tasks.push(readStream(stderrStream, (chunk) => {
            this.stderr += chunk
            this.notifyLogEvent()
          }).then(() => {}))
        }
        await Promise.all(tasks)
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
    const combined = `${this.stdout}\n${this.stderr}`
    for (const line of combined.split('\n')) {
      if (regex.test(line)) {
        return line
      }
    }
    return undefined
  }

  async kill(signal?: string): Promise<void> {
    await this.process.kill(signal)
  }

  async logs(): Promise<{ stdout: string, stderr: string }> {
    this.startLogsPump()
    await this.waitForLogEvent(10)
    return { stdout: this.stdout, stderr: this.stderr }
  }

  async wait(timeout?: number): Promise<{ exitCode: number }> {
    const waitResult = timeout
      ? await Promise.race([
          this.process.status,
          new Promise<never>((_, reject) => setTimeout(() => reject(new SandboxError('Process wait timeout', 'TIMEOUT')), timeout)),
        ])
      : await this.process.status

    return { exitCode: waitResult.code }
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
        matchedLine = this.findMatchingLine(regex)
        if (matchedLine) {
          return { line: matchedLine }
        }
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
        const url = hostname.includes('://') ? hostname : `http://${hostname}:${port}`
        await this.sandbox.fetch(url, { signal: controller.signal })
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

class DenoNamespaceImpl implements DenoSandboxNamespace {
  readonly native: DenoSandboxInstance
  private sandbox: DenoSandboxInstance

  constructor(sandbox: DenoSandboxInstance) {
    this.native = sandbox
    this.sandbox = sandbox
  }

  get runtime(): SandboxDeno {
    return this.sandbox.deno
  }

  get env(): SandboxEnv {
    return this.sandbox.env
  }

  get fs(): SandboxFs {
    return this.sandbox.fs
  }

  get url(): string | undefined {
    return this.sandbox.url
  }

  get ssh(): { username: string, hostname: string } | undefined {
    return this.sandbox.ssh
  }

  async exposeHttp(target: { port: number } | { pid: number }): Promise<string> {
    return this.sandbox.exposeHttp(target)
  }

  async exposeSsh(): Promise<{ hostname: string, username: string }> {
    return this.sandbox.exposeSsh()
  }

  async exposeVscode(path?: string, options?: DenoSandboxVsCodeOptions): Promise<DenoSandboxVsCode> {
    return this.sandbox.exposeVscode(path, options)
  }

  async extendTimeout(timeout: `${number}s` | `${number}m`): Promise<Date> {
    return this.sandbox.extendTimeout(timeout)
  }

  async fetch(url: string | URL, init?: RequestInit): Promise<Response> {
    return this.sandbox.fetch(url, init)
  }

  async close(): Promise<void> {
    await this.sandbox.close()
  }

  async kill(): Promise<void> {
    await this.sandbox.kill()
  }

  async spawn(command: string | URL, options?: DenoSandboxSpawnOptions): Promise<DenoSandboxChildProcess> {
    return this.sandbox.spawn(command, options)
  }
}

export class DenoSandboxAdapter extends BaseSandboxAdapter<'deno'> {
  readonly id: string
  readonly provider = 'deno' as const
  readonly supports: SandboxCapabilities = {
    execEnv: true,
    execCwd: true,
    execSudo: false,
    listFiles: true,
    exists: true,
    deleteFile: true,
    moveFile: true,
    readFileStream: true,
    startProcess: true,
  }

  private sandbox: DenoSandboxInstance
  private _deno?: DenoSandboxNamespace

  constructor(sandbox: DenoSandboxInstance) {
    super()
    this.sandbox = sandbox
    this.id = sandbox.id
  }

  override get deno(): DenoSandboxNamespace {
    if (!this._deno) {
      this._deno = new DenoNamespaceImpl(this.sandbox)
    }
    return this._deno
  }

  async exec(command: string, args: string[] = [], opts?: SandboxExecOptions): Promise<SandboxExecResult> {
    if (opts?.sudo)
      throw new NotSupportedError('sudo', 'deno')

    const spawnOpts: DenoSandboxSpawnOptions = {
      args,
      cwd: opts?.cwd,
      env: opts?.env,
      stdout: 'piped',
      stderr: 'piped',
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (opts?.timeout) {
      const controller = new AbortController()
      spawnOpts.signal = controller.signal
      timeoutId = setTimeout(() => controller.abort(), opts.timeout)
    }

    const child = await this.sandbox.spawn(command, spawnOpts)

    try {
      if (opts?.onStdout || opts?.onStderr) {
        const stdoutChunks: string[] = []
        const stderrChunks: string[] = []

        const stdoutPromise = child.stdout
          ? readStream(child.stdout, (chunk) => {
              stdoutChunks.push(chunk)
              opts.onStdout?.(chunk)
            }).then(() => {})
          : Promise.resolve()

        const stderrPromise = child.stderr
          ? readStream(child.stderr, (chunk) => {
              stderrChunks.push(chunk)
              opts.onStderr?.(chunk)
            }).then(() => {})
          : Promise.resolve()

        const status = await child.status
        await Promise.all([stdoutPromise, stderrPromise])

        return {
          ok: status.success,
          stdout: stdoutChunks.join(''),
          stderr: stderrChunks.join(''),
          code: status.code,
        }
      }

      const output = await child.output()
      return {
        ok: output.status.success,
        stdout: output.stdoutText ?? '',
        stderr: output.stderrText ?? '',
        code: output.status.code,
      }
    }
    finally {
      if (timeoutId)
        clearTimeout(timeoutId)
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.sandbox.fs.writeTextFile(path, content)
  }

  async readFile(path: string): Promise<string> {
    try {
      return await this.sandbox.fs.readTextFile(path)
    }
    catch {
      const data = await this.sandbox.fs.readFile(path)
      return new TextDecoder().decode(data)
    }
  }

  async stop(): Promise<void> {
    await this.sandbox.close()
  }

  async mkdir(path: string, opts?: { recursive?: boolean }): Promise<void> {
    await this.sandbox.fs.mkdir(path, opts)
  }

  async readFileStream(path: string): Promise<ReadableStream<Uint8Array>> {
    const content = await this.sandbox.fs.readFile(path)
    return new ReadableStream({
      start(controller) {
        controller.enqueue(content)
        controller.close()
      },
    })
  }

  async startProcess(cmd: string, args: string[] = [], opts?: SandboxProcessOptions): Promise<SandboxProcess> {
    const spawnOpts: DenoSandboxSpawnOptions = {
      args,
      cwd: opts?.cwd,
      env: opts?.env,
      stdout: 'piped',
      stderr: 'piped',
    }

    const process = await this.sandbox.spawn(cmd, spawnOpts)
    const processId = `deno-proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return new DenoProcessHandle(processId, `${cmd} ${args.join(' ')}`, process, this.sandbox)
  }

  override async listFiles(path: string, opts?: SandboxListFilesOptions): Promise<SandboxFileEntry[]> {
    const results: SandboxFileEntry[] = []
    const base = path.replace(/\/$/, '')

    const walk = async (dir: string): Promise<void> => {
      for await (const entry of this.sandbox.fs.readDir(dir)) {
        const entryPath = `${dir}/${entry.name}`
        const type = entry.isDirectory ? 'directory' : 'file'
        results.push({ name: entry.name, path: entryPath, type })
        if (opts?.recursive && entry.isDirectory) {
          await walk(entryPath)
        }
      }
    }

    await walk(base)
    return results
  }

  override async exists(path: string): Promise<boolean> {
    try {
      await this.sandbox.fs.stat(path)
      return true
    }
    catch {
      return false
    }
  }

  override async deleteFile(path: string): Promise<void> {
    await this.sandbox.fs.remove(path)
  }

  override async moveFile(src: string, dst: string): Promise<void> {
    await this.sandbox.fs.rename(src, dst)
  }
}

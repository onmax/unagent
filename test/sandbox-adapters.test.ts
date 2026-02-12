import type { CloudflareProcessInfo, CloudflareSandboxStub } from '../src/sandbox/types/common'
import type { ChildProcess, ChildProcessOutput, ChildProcessStatus, DenoSandboxInstance } from '../src/sandbox/types/deno'
import type { VercelCommandResult, VercelSandboxInstance } from '../src/sandbox/types/vercel'
import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { CloudflareSandboxAdapter } from '../src/sandbox/adapters/cloudflare'
import { DenoSandboxAdapter } from '../src/sandbox/adapters/deno'
import { VercelSandboxAdapter } from '../src/sandbox/adapters/vercel'
import { NotSupportedError, SandboxError } from '../src/sandbox/errors'

function createCloudflareStub(overrides: Partial<CloudflareSandboxStub> = {}): CloudflareSandboxStub {
  return {
    exec: async () => ({
      success: true,
      exitCode: 0,
      stdout: '',
      stderr: '',
      command: 'echo',
      duration: 1,
      timestamp: new Date().toISOString(),
    }),
    writeFile: async path => ({ success: true, path, timestamp: new Date().toISOString() }),
    readFile: async path => ({ success: true, path, content: '', timestamp: new Date().toISOString() }),
    destroy: async () => {},
    ...overrides,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

function createDenoSandboxStub(overrides: Partial<DenoSandboxInstance> = {}): DenoSandboxInstance {
  const files = new Map<string, string>()
  const status: ChildProcessStatus = { success: true, code: 0, signal: null }
  const output: ChildProcessOutput = {
    status,
    stdout: new TextEncoder().encode('hello\\n'),
    stderr: new TextEncoder().encode(''),
    stdoutText: 'hello\\n',
    stderrText: '',
  }
  const child: ChildProcess = {
    pid: 1,
    status: Promise.resolve(status),
    stdin: null,
    stdout: createReadableStream(['ready\\n']),
    stderr: createReadableStream([]),
    [Symbol.asyncDispose]: async () => {},
    kill: async () => {},
    output: async () => output,
  }

  return {
    id: 'deno-1',
    closed: Promise.resolve(),
    deno: {
      deploy: async () => ({}),
      eval: async () => ({}),
      repl: async () => child,
      run: async () => child,
    },
    env: {
      get: async key => files.get(`env:${key}`),
      set: async (key, value) => { files.set(`env:${key}`, value) },
      delete: async (key) => { files.delete(`env:${key}`) },
      toObject: async () => ({}),
    },
    fs: {
      readTextFile: async path => files.get(path) ?? '',
      readFile: async path => new TextEncoder().encode(files.get(path) ?? ''),
      writeTextFile: async (path, data) => { files.set(path, data) },
      mkdir: async () => {},
      async* readDir() {},
      stat: async () => ({ size: 0, isFile: true, isDirectory: false, isSymlink: false }),
      remove: async () => {},
      rename: async () => {},
    },
    ssh: { username: 'deno', hostname: 'sandbox.local' },
    url: 'https://sandbox.local',
    sh: () => ({ output: async () => output }),
    close: async () => {},
    exposeHttp: async () => 'https://sandbox.local/http',
    exposeSsh: async () => ({ hostname: 'sandbox.local', username: 'deno' }),
    exposeVscode: async () => ({ url: 'https://sandbox.local/vscode' }),
    extendTimeout: async () => new Date(),
    fetch: async () => new Response('ok'),
    kill: async () => {},
    spawn: async () => child,
    [Symbol.asyncDispose]: async () => {},
    ...overrides,
  }
}

describe('sandbox adapters', () => {
  it('cloudflare waitForLog falls back to polling when native wait exits early', async () => {
    const processInfo: CloudflareProcessInfo = {
      id: 'proc-1',
      command: 'demo',
      kill: async () => {},
      logs: async () => ({ stdout: 'tick 1\ntick 2\n', stderr: '' }),
      wait: async () => ({ exitCode: 0 }),
      waitForLog: async () => {
        throw new Error('ProcessExitedBeforeReadyError: Process exited with code 0 before becoming ready')
      },
    }

    const stub = createCloudflareStub({
      startProcess: async () => processInfo,
    })
    const adapter = new CloudflareSandboxAdapter('cf-1', stub)
    const process = await adapter.startProcess('sh', ['-c', 'demo'])

    await expect(process.waitForLog(/tick 2/, 300)).resolves.toEqual({ line: 'tick 2' })
  })

  it('cloudflare process compatibility supports getLogs()/waitForExit()', async () => {
    const stub = createCloudflareStub({
      startProcess: async () => ({
        id: 'proc-compat',
        command: 'demo',
        kill: async () => {},
        getLogs: async () => ({ stdout: 'tick 1\ntick 2\n', stderr: '' }),
        waitForExit: async () => ({ exitCode: 0 }),
        waitForLog: async () => {
          throw new Error('ProcessExitedBeforeReadyError: Process exited with code 0 before becoming ready')
        },
      } as unknown as CloudflareProcessInfo),
    })

    const adapter = new CloudflareSandboxAdapter('cf-compat', stub)
    const process = await adapter.startProcess('sh', ['-c', 'demo'])

    await expect(process.waitForLog(/tick 2/, 300)).resolves.toEqual({ line: 'tick 2' })
    await expect(process.logs()).resolves.toEqual({ stdout: 'tick 1\ntick 2\n', stderr: '' })
    await expect(process.wait(300)).resolves.toEqual({ exitCode: 0 })
  })

  it('cloudflare port methods require explicit hostname', async () => {
    const exposePort = vi.fn(async () => ({ url: 'https://preview.example.com' }))
    const getExposedPorts = vi.fn(async () => [{ port: 8080, url: 'https://preview.example.com', hostname: 'preview.example.com' }])
    const stub = createCloudflareStub({
      exposePort,
      getExposedPorts,
    } as unknown as Partial<CloudflareSandboxStub>)

    const adapter = new CloudflareSandboxAdapter('cf-2', stub)

    await expect(adapter.cloudflare.exposePort(8080, { protocol: 'http' })).rejects.toBeInstanceOf(SandboxError)
    await expect(adapter.cloudflare.getExposedPorts()).rejects.toBeInstanceOf(SandboxError)
    expect(exposePort).not.toHaveBeenCalled()
    expect(getExposedPorts).not.toHaveBeenCalled()
  })

  it('cloudflare gitCheckout wraps upstream failures into structured SandboxError', async () => {
    const stub = createCloudflareStub({
      gitCheckout: async () => {
        throw new Error('repository not found')
      },
    } as unknown as Partial<CloudflareSandboxStub>)

    const adapter = new CloudflareSandboxAdapter('cf-git-1', stub)

    await expect(
      adapter.cloudflare.gitCheckout('https://github.com/unjs/unagent', { depth: 1 }),
    ).rejects.toMatchObject({
      name: 'SandboxError',
      code: 'CF_GIT_CHECKOUT_FAILED',
      provider: 'cloudflare',
      details: expect.objectContaining({
        operation: 'gitCheckout',
      }),
    })
  })

  it('cloudflare gitCheckout throws NotSupportedError when SDK method is unavailable', async () => {
    const adapter = new CloudflareSandboxAdapter('cf-git-2', createCloudflareStub())
    await expect(adapter.cloudflare.gitCheckout('https://github.com/unjs/unagent')).rejects.toBeInstanceOf(NotSupportedError)
  })

  it('vercel waitForLog remains stable with concurrent log reads', async () => {
    const logsFactory = vi.fn(async function* () {
      yield { stream: 'stdout' as const, data: 'tick 1\n' }
      await sleep(20)
      yield { stream: 'stdout' as const, data: 'tick 2\n' }
      await sleep(20)
    })

    const cmdResult: VercelCommandResult = {
      exitCode: 0,
      stdout: async () => '',
      stderr: async () => '',
      logs: logsFactory,
      kill: async () => {},
      wait: async () => ({ exitCode: 0 }),
    }

    const instance: VercelSandboxInstance = {
      runCommand: vi.fn(async () => cmdResult) as unknown as VercelSandboxInstance['runCommand'],
      writeFiles: async () => {},
      readFileToBuffer: async () => new Uint8Array(),
      readFile: async () => Readable.from([]),
      mkDir: async () => {},
      domain: port => `https://sandbox-${port}.example.com`,
      [Symbol.asyncDispose]: async () => {},
    }

    const adapter = new VercelSandboxAdapter('vercel-1', instance, { runtime: 'node24', createdAt: new Date().toISOString() })
    const process = await adapter.startProcess('sh', ['-c', 'demo'])

    const [logs, match] = await Promise.all([
      process.logs(),
      process.waitForLog(/tick 2/, 1_000),
    ])

    expect(match.line).toBe('tick 2')
    expect(logsFactory).toHaveBeenCalledTimes(1)
    expect(logs.stdout).toContain('tick')
    const finalLogs = await process.logs()
    expect(finalLogs.stdout).toContain('tick 1')
    expect(finalLogs.stdout).toContain('tick 2')
  })

  it('deno adapter exec and file operations work', async () => {
    const adapter = new DenoSandboxAdapter(createDenoSandboxStub())

    const result = await adapter.exec('echo', ['hello'])
    expect(result.ok).toBe(true)
    expect(result.stdout).toBe('hello\\n')

    await adapter.writeFile('/tmp/test.txt', 'hi')
    await expect(adapter.readFile('/tmp/test.txt')).resolves.toBe('hi')
  })

  it('deno adapter startProcess exposes logs', async () => {
    const adapter = new DenoSandboxAdapter(createDenoSandboxStub())
    const process = await adapter.startProcess('echo', ['ready'])

    const result = await process.waitForLog(/ready/)
    expect(result.line).toContain('ready')
    const logs = await process.logs()
    expect(logs.stdout).toContain('ready')
  })
})

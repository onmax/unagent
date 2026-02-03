import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { CloudflareSandboxAdapter } from '../src/sandbox/adapters/cloudflare'
import { SandboxError } from '../src/sandbox/errors'
import { VercelSandboxAdapter } from '../src/sandbox/adapters/vercel'
import type { CloudflareProcessInfo, CloudflareSandboxStub } from '../src/sandbox/types/common'
import type { VercelCommandResult, VercelSandboxInstance } from '../src/sandbox/types/vercel'

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
    writeFile: async (path) => ({ success: true, path, timestamp: new Date().toISOString() }),
    readFile: async (path) => ({ success: true, path, content: '', timestamp: new Date().toISOString() }),
    destroy: async () => {},
    ...overrides,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
})

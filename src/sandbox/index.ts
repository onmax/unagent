import { Buffer } from 'node:buffer'
import { accessSync } from 'node:fs'
import { createRequire } from 'node:module'

export type SandboxProvider = 'vercel' | 'cloudflare'
export type SandboxType = 'docker' | 'cloudflare' | 'vercel' | 'none'

export interface SandboxOptions {
  provider: SandboxProvider
  runtime?: string
  timeout?: number
  cpu?: number
}

export interface SandboxExecResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number | null
}

export interface Sandbox {
  id: string
  provider: SandboxProvider
  exec: (command: string, args: string[]) => Promise<SandboxExecResult>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  stop: () => Promise<void>
}

export interface SandboxDetection {
  type: SandboxType
  details?: Record<string, string>
}

export function detectSandbox(): SandboxDetection {
  if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'workers' } }

  if (process.env.VERCEL || process.env.VERCEL_ENV)
    return { type: 'vercel', details: { env: process.env.VERCEL_ENV ?? 'unknown' } }

  if (process.env.DOCKER_CONTAINER || existsSync('/.dockerenv'))
    return { type: 'docker' }

  return { type: 'none' }
}

function existsSync(path: string): boolean {
  try {
    accessSync(path)
    return true
  }
  catch {
    return false
  }
}

const _require = createRequire(import.meta.url)

async function loadVercelSandbox(): Promise<unknown> {
  const moduleName = '@vercel/sandbox'
  try {
    return await import(/* @vite-ignore */ moduleName)
  }
  catch (e) {
    throw new Error(`${moduleName} load failed: ${e instanceof Error ? e.message : e}`)
  }
}

function loadCloudflareSandboxSync(): unknown {
  const moduleName = '@cloudflare/sandbox'
  try {
    return _require(moduleName)
  }
  catch (e) {
    throw new Error(`${moduleName} load failed: ${e instanceof Error ? e.message : e}`)
  }
}

// Vercel Sandbox v1.x types
interface VercelSandboxInstance {
  runCommand: (cmd: string, args: string[]) => Promise<{ exitCode: number, stdout: () => Promise<string>, stderr: () => Promise<string> }>
  writeFiles: (files: Array<{ path: string, content: Buffer }>) => Promise<void>
  readFileToBuffer: (opts: { path: string }) => Promise<Buffer>
  [Symbol.asyncDispose]: () => Promise<void>
}

interface VercelSandboxSDK {
  Sandbox: {
    create: (options: { runtime: string, timeoutMs?: number, resources?: { vcpus?: number } }) => Promise<VercelSandboxInstance>
  }
}

// Cloudflare Sandbox SDK types (matches @cloudflare/sandbox v0.7+)
interface CloudflareExecResult { success: boolean, exitCode: number, stdout: string, stderr: string, command: string, duration: number, timestamp: string, sessionId?: string }
interface CloudflareWriteFileResult { success: boolean, path: string, timestamp: string, exitCode?: number }
interface CloudflareReadFileResult { success: boolean, path: string, content: string, timestamp: string, exitCode?: number, encoding?: 'utf-8' | 'base64', isBinary?: boolean, mimeType?: string, size?: number }
interface CloudflareSandboxStub {
  exec: (cmd: string, opts?: { timeout?: number, env?: Record<string, string | undefined>, cwd?: string }) => Promise<CloudflareExecResult>
  writeFile: (path: string, content: string, opts?: { encoding?: string }) => Promise<CloudflareWriteFileResult>
  readFile: (path: string, opts?: { encoding?: string }) => Promise<CloudflareReadFileResult>
  destroy: () => Promise<void>
}

export interface CloudflareSandboxOptions { sleepAfter?: string | number, keepAlive?: boolean, normalizeId?: boolean }
/** DurableObjectNamespace shape - matches Cloudflare Workers runtime */
export interface DurableObjectNamespaceLike { idFromName: (name: string) => unknown, get: (id: unknown) => unknown }
interface CloudflareSandboxSDK {
  getSandbox: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T
  Sandbox: new (...args: unknown[]) => unknown
}

class VercelSandbox implements Sandbox {
  id: string
  provider: SandboxProvider = 'vercel'
  private instance: VercelSandboxInstance

  constructor(id: string, instance: VercelSandboxInstance) {
    this.id = id
    this.instance = instance
  }

  async exec(command: string, args: string[]): Promise<SandboxExecResult> {
    const result = await this.instance.runCommand(command, args)
    const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()])
    return { ok: result.exitCode === 0, stdout, stderr, code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.instance.writeFiles([{ path, content: Buffer.from(content) }])
  }

  async readFile(path: string): Promise<string> {
    const buffer = await this.instance.readFileToBuffer({ path })
    return buffer.toString()
  }

  async stop(): Promise<void> {
    await this.instance[Symbol.asyncDispose]()
  }
}

function shellQuote(arg: string): string {
  if (!/[^\w\-./=]/.test(arg))
    return arg
  return `'${arg.replace(/'/g, `'\\''`)}'`
}

class CloudflareSandbox implements Sandbox {
  id: string
  provider: SandboxProvider = 'cloudflare'
  private stub: CloudflareSandboxStub

  constructor(id: string, stub: CloudflareSandboxStub) {
    this.id = id
    this.stub = stub
  }

  async exec(command: string, args: string[]): Promise<SandboxExecResult> {
    const cmd = args.length ? `${shellQuote(command)} ${args.map(shellQuote).join(' ')}` : shellQuote(command)
    const result = await this.stub.exec(cmd)
    return { ok: result.success, stdout: result.stdout, stderr: result.stderr, code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const result = await this.stub.writeFile(path, content)
    if (!result.success)
      throw new Error(`Failed to write file: ${path}`)
  }

  async readFile(path: string): Promise<string> {
    const result = await this.stub.readFile(path)
    if (!result.success)
      throw new Error(`Failed to read file: ${path}`)
    return result.content
  }

  async stop(): Promise<void> {
    await this.stub.destroy()
  }
}

export async function createSandbox(options: SandboxOptions): Promise<Sandbox> {
  const { provider, runtime, timeout, cpu } = options
  const id = `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (provider === 'vercel') {
    const sdk = await loadVercelSandbox() as VercelSandboxSDK
    const instance = await sdk.Sandbox.create({
      runtime: runtime ?? 'node24',
      timeoutMs: timeout ?? 300_000,
      ...(cpu && { resources: { vcpus: cpu } }),
    })
    return new VercelSandbox(id, instance)
  }

  if (provider === 'cloudflare') {
    // Note: Cloudflare sandbox requires Durable Objects binding in workers context
    // The namespace must be passed via options or environment
    throw new Error('Cloudflare sandbox requires Durable Objects binding. Use createCloudflareSandbox() with namespace.')
  }

  throw new Error(`Unknown sandbox provider: ${provider}`)
}

/**
 * Create a Cloudflare sandbox instance.
 * Requires Durable Objects binding - only works within Workers/Pages context.
 * @param namespace - Durable Object namespace binding (e.g., env.SANDBOX)
 * @param sandboxId - Unique ID for the sandbox instance
 * @param options - Optional sandbox configuration
 * @param options.sleepAfter - Duration after which sandbox sleeps if idle (e.g., "10m", 600)
 * @param options.keepAlive - Keep sandbox alive indefinitely (must call destroy() manually)
 * @param options.normalizeId - Normalize sandbox ID to lowercase for preview URL compatibility
 */
export function createCloudflareSandbox(namespace: DurableObjectNamespaceLike, sandboxId?: string, options?: CloudflareSandboxOptions): Sandbox {
  const sdk = loadCloudflareSandboxSync() as CloudflareSandboxSDK
  const id = sandboxId ?? `cloudflare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const stub = sdk.getSandbox<CloudflareSandboxStub>(namespace, id, options)
  return new CloudflareSandbox(id, stub)
}

export function isSandboxAvailable(provider: SandboxProvider): boolean {
  try {
    if (provider === 'vercel') {
      _require.resolve('@vercel/sandbox')
      return true
    }
    if (provider === 'cloudflare') {
      _require.resolve('@cloudflare/sandbox')
      return true
    }
    return false
  }
  catch {
    return false
  }
}

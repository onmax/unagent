import { Buffer } from 'node:buffer'
import { accessSync } from 'node:fs'
import { createRequire } from 'node:module'

export type SandboxProvider = 'vercel' | 'cloudflare'
export type SandboxType = 'docker' | 'cloudflare' | 'vercel' | 'none'

export interface SandboxOptions {
  provider: SandboxProvider
  runtime?: string
  timeout?: number
  memory?: number
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
  catch {
    throw new Error(`${moduleName} not installed. Add as peer dependency: pnpm add ${moduleName}`)
  }
}

async function loadCloudflareSandbox(): Promise<unknown> {
  const moduleName = '@cloudflare/sandbox'
  try {
    return await import(/* @vite-ignore */ moduleName)
  }
  catch {
    throw new Error(`${moduleName} not installed. Add as peer dependency.`)
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

// Cloudflare Sandbox v0.7.x types
interface CloudflareSandboxInstance {
  exec: (cmd: string, opts?: { timeout?: number }) => Promise<{ exitCode: number, stdout?: string, stderr?: string }>
  writeFile: (path: string, content: string) => Promise<{ success: boolean }>
  readFile: (path: string) => Promise<{ content: string }>
  destroy: () => Promise<void>
}

interface CloudflareSandboxSDK {
  getSandbox: (namespace: unknown, id: string) => Promise<CloudflareSandboxInstance>
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
  private instance: CloudflareSandboxInstance

  constructor(id: string, instance: CloudflareSandboxInstance) {
    this.id = id
    this.instance = instance
  }

  async exec(command: string, args: string[]): Promise<SandboxExecResult> {
    const quotedArgs = args.map(shellQuote).join(' ')
    const cmd = `${shellQuote(command)} ${quotedArgs}`
    const result = await this.instance.exec(cmd)
    return { ok: result.exitCode === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '', code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.instance.writeFile(path, content)
  }

  async readFile(path: string): Promise<string> {
    const result = await this.instance.readFile(path)
    return result.content
  }

  async stop(): Promise<void> {
    await this.instance.destroy()
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
 */
export async function createCloudflareSandbox(namespace: unknown, sandboxId?: string): Promise<Sandbox> {
  const sdk = await loadCloudflareSandbox() as CloudflareSandboxSDK
  const id = sandboxId ?? `cloudflare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const instance = await sdk.getSandbox(namespace, id)
  return new CloudflareSandbox(id, instance)
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

import type {
  CloudflareSandboxOptions,
  CloudflareSandboxStub,
  DurableObjectNamespaceLike,
  Sandbox,
  SandboxExecResult,
  SandboxOptions,
  SandboxProvider,
} from './types'
import { Buffer } from 'node:buffer'
import { provider as envProvider, isWorkerd } from 'std-env'
import { CloudflareSandboxAdapter } from './adapters'

export type { CloudflareSandboxOptions, DurableObjectNamespaceLike, Sandbox, SandboxExecResult, SandboxOptions, SandboxProvider } from './types'

async function loadVercelSandbox(): Promise<unknown> {
  const moduleName = '@vercel/sandbox'
  try {
    return await import(moduleName)
  }
  catch (e) {
    throw new Error(`${moduleName} load failed. Install it to use the Vercel provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

async function loadCloudflareSandbox(): Promise<unknown> {
  const moduleName = '@cloudflare/sandbox'
  try {
    return await import(moduleName)
  }
  catch (e) {
    throw new Error(`${moduleName} load failed. Install it to use the Cloudflare provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

// Vercel Sandbox v1.x types
interface VercelSandboxInstance {
  runCommand: (cmd: string, args: string[]) => Promise<{ exitCode: number, stdout: () => Promise<string>, stderr: () => Promise<string> }>
  writeFiles: (files: Array<{ path: string, content: Uint8Array }>) => Promise<void>
  readFileToBuffer: (opts: { path: string }) => Promise<Uint8Array>
  [Symbol.asyncDispose]: () => Promise<void>
}

interface VercelSandboxSDK {
  Sandbox: {
    create: (options: { runtime: string, timeoutMs?: number, resources?: { vcpus?: number } }) => Promise<VercelSandboxInstance>
  }
}

// Cloudflare Sandbox SDK types (matches @cloudflare/sandbox v0.7+)
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
    return Buffer.from(buffer).toString()
  }

  async stop(): Promise<void> {
    await this.instance[Symbol.asyncDispose]()
  }
}

export async function createSandbox(options: SandboxOptions = {}): Promise<Sandbox> {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'vercel') {
    const id = `vercel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { runtime, timeout, cpu } = resolved
    const sdk = await loadVercelSandbox() as VercelSandboxSDK
    const instance = await sdk.Sandbox.create({
      runtime: runtime ?? 'node24',
      timeoutMs: timeout ?? 300_000,
      ...(cpu && { resources: { vcpus: cpu } }),
    })
    return new VercelSandbox(id, instance)
  }

  if (resolved.name === 'cloudflare') {
    if (!resolved.namespace)
      throw new Error('Cloudflare sandbox requires a Durable Objects binding. Pass { provider: { name: \'cloudflare\', namespace } }.')

    const { namespace, sandboxId, cloudflare, getSandbox: providedGetSandbox } = resolved
    const id = sandboxId ?? `cloudflare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const getSandbox = providedGetSandbox ?? (await loadCloudflareSandbox() as CloudflareSandboxSDK).getSandbox
    const stub = getSandbox(namespace, id, cloudflare)
    return new CloudflareSandboxAdapter(id, stub)
  }

  throw new Error(`Unknown sandbox provider: ${(resolved as { name: string }).name}`)
}

type ResolvedProvider
  = | { name: 'vercel', runtime?: string, timeout?: number, cpu?: number }
    | { name: 'cloudflare', namespace?: DurableObjectNamespaceLike, sandboxId?: string, cloudflare?: CloudflareSandboxOptions, getSandbox?: CloudflareSandboxSDK['getSandbox'] }

function resolveProvider(provider: SandboxProvider | 'auto' | { name: 'vercel', runtime?: string, timeout?: number, cpu?: number } | { name: 'cloudflare', namespace: DurableObjectNamespaceLike, sandboxId?: string, cloudflare?: CloudflareSandboxOptions, getSandbox?: CloudflareSandboxSDK['getSandbox'] } | undefined): ResolvedProvider {
  if (provider && provider !== 'auto') {
    if (typeof provider === 'string') {
      return provider === 'cloudflare' ? { name: 'cloudflare' } : { name: 'vercel' }
    }
    return provider
  }

  if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
    return { name: 'cloudflare' }
  if (envProvider === 'vercel')
    return { name: 'vercel' }

  if (typeof process !== 'undefined') {
    if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
      return { name: 'cloudflare' }
    if (process.env.VERCEL || process.env.VERCEL_ENV)
      return { name: 'vercel' }
  }

  throw new Error('Unable to auto-detect sandbox provider. Pass { provider }.')
}

import type { CloudflareSandbox, CloudflareSandboxOptions, CloudflareSandboxStub, CloudflareProviderOptions, DurableObjectNamespaceLike, Sandbox, SandboxOptions, VercelProviderOptions, VercelSandbox, VercelSandboxListItem, VercelSandboxSDK } from './types'
import { provider as envProvider, isWorkerd } from 'std-env'
import { CloudflareSandboxAdapter, VercelSandboxAdapter } from './adapters'

// Re-exports
export type { CloudflareSandbox, CloudflareSandboxOptions, CloudflareNamespace, CloudflareProviderOptions, CloudflareSession, CodeContext, CodeExecutionResult, DurableObjectNamespaceLike, SandboxCapabilities, SandboxExecOptions, ExposedPort, FileEntry, GitCheckoutResult, ListFilesOptions, NetworkPolicy, ProcessOptions, Sandbox, SandboxExecResult, SandboxOptions, SandboxProcess, SandboxProvider, VercelNamespace, VercelProviderOptions, VercelSandbox, VercelSandboxMetadata, VercelSnapshot, WaitForPortOptions } from './types'
export { NotSupportedError, SandboxError } from './errors'

async function loadVercelSandbox(): Promise<VercelSandboxSDK> {
  const moduleName = '@vercel/sandbox'
  try {
    return await import(moduleName) as VercelSandboxSDK
  }
  catch (e) {
    throw new Error(`${moduleName} load failed. Install it to use the Vercel provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

async function loadCloudflareSandbox(): Promise<{ getSandbox: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T }> {
  const moduleName = '@cloudflare/sandbox'
  try {
    return await import(moduleName) as { getSandbox: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T }
  }
  catch (e) {
    throw new Error(`${moduleName} load failed. Install it to use the Cloudflare provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

// Factory overloads for type inference
export function createSandbox(opts: { provider: VercelProviderOptions }): Promise<VercelSandbox>
export function createSandbox(opts: { provider: CloudflareProviderOptions }): Promise<CloudflareSandbox>
export function createSandbox(opts?: SandboxOptions): Promise<Sandbox>
export async function createSandbox(options: SandboxOptions = {}): Promise<Sandbox> {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'vercel') {
    const id = `vercel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { runtime = 'node24', timeout = 300_000, cpu, ports } = resolved
    const sdk = await loadVercelSandbox()
    const instance = await sdk.Sandbox.create({
      runtime,
      timeout,
      ports,
      ...(cpu && { resources: { vcpus: cpu } }),
    })
    return new VercelSandboxAdapter(id, instance, { runtime, createdAt: new Date().toISOString() })
  }

  if (resolved.name === 'cloudflare') {
    if (!resolved.namespace)
      throw new Error('Cloudflare sandbox requires a Durable Objects binding. Pass { provider: { name: \'cloudflare\', namespace } }.')

    const { namespace, sandboxId, cloudflare, getSandbox: providedGetSandbox } = resolved
    const id = sandboxId ?? `cloudflare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const getSandbox = providedGetSandbox ?? (await loadCloudflareSandbox()).getSandbox
    const stub = getSandbox(namespace, id, cloudflare)
    return new CloudflareSandboxAdapter(id, stub)
  }

  throw new Error(`Unknown sandbox provider: ${(resolved as { name: string }).name}`)
}

type ResolvedProvider =
  | { name: 'vercel'; runtime?: string; timeout?: number; cpu?: number; ports?: number[] }
  | { name: 'cloudflare'; namespace?: DurableObjectNamespaceLike; sandboxId?: string; cloudflare?: CloudflareSandboxOptions; getSandbox?: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T }

function resolveProvider(provider: VercelProviderOptions | CloudflareProviderOptions | undefined): ResolvedProvider {
  if (provider) {
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

// === Static methods for Vercel ===
export const VercelSandboxStatic = {
  async list(): Promise<{ sandboxes: VercelSandboxListItem[] }> {
    const sdk = await loadVercelSandbox()
    return sdk.Sandbox.list()
  },

  async get(id: string): Promise<VercelSandbox | null> {
    const sdk = await loadVercelSandbox()
    const instance = await sdk.Sandbox.get(id)
    if (!instance) return null
    return new VercelSandboxAdapter(id, instance, { runtime: 'unknown', createdAt: 'unknown' })
  },
}

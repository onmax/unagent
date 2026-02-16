import type { CloudflareSandboxClient, CloudflareSandboxOptions, CloudflareSandboxProviderOptions, CloudflareSandboxStub, DenoSandboxClient, DenoSandboxProviderOptions, DenoSandboxSDK, DurableObjectNamespaceLike, SandboxClient, SandboxOptions, SandboxProvider, VercelSandboxClient, VercelSandboxCredentials, VercelSandboxListItem, VercelSandboxProviderOptions, VercelSandboxSDK } from './types'
import type { SandboxDetectionResult } from './types/common'
import { provider as envProvider, isWorkerd } from 'std-env'
import { dynamicImport } from '../_internal/dynamic-import'
import { CloudflareSandboxAdapter, DenoSandboxAdapter, VercelSandboxAdapter } from './adapters'
import { SandboxError } from './errors'
import { validateSandboxConfig } from './validation'

export { NotSupportedError, SandboxError } from './errors'
export { validateSandboxConfig }
export type * from './types'

export function detectSandbox(): SandboxDetectionResult {
  if (isWorkerd || envProvider === 'cloudflare_workers')
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (envProvider === 'cloudflare_pages')
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (envProvider === 'vercel')
    return { type: 'vercel', details: { env: (typeof process !== 'undefined' ? process.env.VERCEL_ENV : undefined) } }
  if (envProvider === 'deno-deploy')
    return { type: 'deno', details: { deploymentId: (typeof process !== 'undefined' ? process.env.DENO_DEPLOYMENT_ID : undefined) } }

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>

  if (env.CLOUDFLARE_WORKER)
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (env.VERCEL || env.VERCEL_ENV)
    return { type: 'vercel', details: { env: env.VERCEL_ENV } }
  if (env.DENO_DEPLOYMENT_ID)
    return { type: 'deno', details: { deploymentId: env.DENO_DEPLOYMENT_ID } }
  if (env.DOCKER_CONTAINER)
    return { type: 'docker' }
  return { type: 'none' }
}

function canResolve(moduleName: string): boolean {
  try {
    const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
    if (!resolver)
      throw new Error('no-require-resolve')
    resolver(moduleName)
    return true
  }
  catch {
    try {
      const resolver = (import.meta as { resolve?: (id: string) => string }).resolve
      if (typeof resolver !== 'function')
        return false
      resolver(moduleName)
      return true
    }
    catch {
      return false
    }
  }
}

export function isSandboxAvailable(provider: SandboxProvider): boolean {
  try {
    if (provider === 'vercel') {
      return canResolve('@vercel/sandbox')
    }
    if (provider === 'cloudflare') {
      return canResolve('@cloudflare/sandbox')
    }
    if (provider === 'deno') {
      return canResolve('@deno/sandbox')
    }
  }
  catch {
    return false
  }
  return false
}

async function loadVercelSandbox(): Promise<VercelSandboxSDK> {
  const moduleName = '@vercel/sandbox'
  try {
    return await dynamicImport<VercelSandboxSDK>(moduleName)
  }
  catch (e) {
    throw new SandboxError(`${moduleName} load failed. Install it to use the Vercel provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

async function loadCloudflareSandbox(): Promise<{ getSandbox: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T }> {
  const moduleName = '@cloudflare/sandbox'
  try {
    return await dynamicImport<{ getSandbox: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T }>(moduleName)
  }
  catch (e) {
    throw new SandboxError(`${moduleName} load failed. Install it to use the Cloudflare provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

async function loadDenoSandbox(): Promise<DenoSandboxSDK> {
  const moduleName = '@deno/sandbox'
  try {
    return await dynamicImport<DenoSandboxSDK>(moduleName)
  }
  catch (e) {
    throw new SandboxError(`${moduleName} load failed. Install it to use the Deno provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}
export function createSandbox(opts: { provider: VercelSandboxProviderOptions }): Promise<VercelSandboxClient>
export function createSandbox(opts: { provider: CloudflareSandboxProviderOptions }): Promise<CloudflareSandboxClient>
export function createSandbox(opts: { provider: DenoSandboxProviderOptions }): Promise<DenoSandboxClient>
export function createSandbox(opts?: SandboxOptions): Promise<SandboxClient>
export async function createSandbox(options: SandboxOptions = {}): Promise<SandboxClient> {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'vercel') {
    const id = `vercel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { runtime = 'node24', timeout = 300_000, cpu, ports, credentials } = resolved
    const sdk = await loadVercelSandbox()
    const instance = await sdk.Sandbox.create({
      runtime,
      timeout,
      ports,
      ...(cpu && { resources: { vcpus: cpu } }),
      ...(credentials && { token: credentials.token, teamId: credentials.teamId, projectId: credentials.projectId }),
    })
    return new VercelSandboxAdapter(id, instance, { runtime, createdAt: new Date().toISOString() })
  }

  if (resolved.name === 'cloudflare') {
    if (!resolved.namespace)
      throw new SandboxError('Cloudflare sandbox requires a Durable Objects binding. Pass { provider: { name: \'cloudflare\', namespace } }.')

    const { namespace, sandboxId, cloudflare, getSandbox: providedGetSandbox } = resolved
    const id = sandboxId ?? `cloudflare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const getSandbox = providedGetSandbox ?? (await loadCloudflareSandbox()).getSandbox
    const stub = getSandbox(namespace, id, cloudflare)
    return new CloudflareSandboxAdapter(id, stub)
  }

  if (resolved.name === 'deno') {
    const validation = validateSandboxConfig(resolved)
    if (!validation.ok) {
      const firstIssue = validation.issues.find(issue => issue.severity === 'error') || validation.issues[0]
      throw new SandboxError(firstIssue?.message || '[deno] invalid sandbox config', {
        code: 'DENO_CONFIG_INVALID',
        provider: 'deno',
        details: { issues: validation.issues },
      })
    }
    const { name: _name, ...sandboxOptions } = resolved
    const sdk = await loadDenoSandbox()
    const instance = await sdk.Sandbox.create(sandboxOptions)
    return new DenoSandboxAdapter(instance)
  }

  throw new SandboxError(`Unknown sandbox provider: ${(resolved as { name: string }).name}`)
}

type ResolvedProvider
  = | { name: 'vercel', runtime?: string, timeout?: number, cpu?: number, ports?: number[], credentials?: VercelSandboxCredentials }
    | { name: 'cloudflare', namespace?: DurableObjectNamespaceLike, sandboxId?: string, cloudflare?: CloudflareSandboxOptions, getSandbox?: <T extends CloudflareSandboxStub>(ns: DurableObjectNamespaceLike, id: string, opts?: CloudflareSandboxOptions) => T }
    | DenoSandboxProviderOptions

function resolveProvider(provider: VercelSandboxProviderOptions | CloudflareSandboxProviderOptions | DenoSandboxProviderOptions | undefined): ResolvedProvider {
  if (provider) {
    return provider
  }

  if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
    return { name: 'cloudflare' }
  if (envProvider === 'vercel')
    return { name: 'vercel' }
  if (envProvider === 'deno-deploy')
    return { name: 'deno' }

  if (typeof process !== 'undefined') {
    if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
      return { name: 'cloudflare' }
    if (process.env.VERCEL || process.env.VERCEL_ENV)
      return { name: 'vercel' }
    if (process.env.DENO_DEPLOYMENT_ID)
      return { name: 'deno' }
  }

  throw new SandboxError('Unable to auto-detect sandbox provider. Pass { provider }.')
}

export const VercelSandboxStatic = {
  async list(): Promise<{ sandboxes: VercelSandboxListItem[] }> {
    const sdk = await loadVercelSandbox()
    return sdk.Sandbox.list()
  },

  async get(id: string): Promise<VercelSandboxClient | null> {
    const sdk = await loadVercelSandbox()
    const instance = await sdk.Sandbox.get(id)
    if (!instance)
      return null
    return new VercelSandboxAdapter(id, instance, { runtime: 'unknown', createdAt: 'unknown' })
  },
}

import type { WorkflowClient, WorkflowDetectionResult, WorkflowOptions, WorkflowProvider, WorkflowProviderOptions } from './types'
import type { CloudflareWorkflowProviderOptions } from './types/cloudflare'
import type { OpenWorkflowProviderOptions } from './types/openworkflow'
import type { VercelWorkflowAPI, VercelWorkflowProviderOptions } from './types/vercel'
import { provider as envProvider, isWorkerd } from 'std-env'
import { dynamicImport } from '../_internal/dynamic-import'
import { assertCloudflareBinding, CloudflareWorkflowAdapter, OpenWorkflowAdapter, VercelWorkflowAdapter } from './adapters'
import { WorkflowError } from './errors'

export { NotSupportedError, WorkflowError } from './errors'
export type * from './types'

export function detectWorkflow(): WorkflowDetectionResult {
  if (isWorkerd || envProvider === 'cloudflare_workers')
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (envProvider === 'cloudflare_pages')
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (envProvider === 'vercel')
    return { type: 'vercel', details: { env: (typeof process !== 'undefined' ? process.env.VERCEL_ENV : undefined) } }

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>

  if (env.CLOUDFLARE_WORKER)
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (env.VERCEL || env.VERCEL_ENV)
    return { type: 'vercel', details: { env: env.VERCEL_ENV } }
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

export function isWorkflowAvailable(provider: WorkflowProvider): boolean {
  if (provider === 'vercel') {
    return canResolve('workflow/api')
  }

  if (provider === 'cloudflare') {
    if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
      return true
    if (typeof process !== 'undefined') {
      if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
        return true
    }
    return false
  }

  if (provider === 'openworkflow') {
    return canResolve('openworkflow')
  }

  return false
}

async function resolveModulePath(moduleName: string): Promise<string> {
  try {
    const globalResolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
    if (globalResolver)
      return globalResolver(moduleName)
  }
  catch {
    // ignore
  }

  try {
    const resolver = (import.meta as { resolve?: (id: string) => string }).resolve
    if (resolver)
      return resolver(moduleName)
  }
  catch {
    // ignore
  }

  return moduleName
}

async function loadVercelWorkflowApi(): Promise<VercelWorkflowAPI> {
  const moduleName = 'workflow/api'
  try {
    return await dynamicImport<VercelWorkflowAPI>('workflow/api')
  }
  catch {
    try {
      return await dynamicImport<VercelWorkflowAPI>('workflow/dist/api.js')
    }
    catch {
      try {
        const resolved = await resolveModulePath(moduleName)
        return await dynamicImport<VercelWorkflowAPI>(resolved)
      }
      catch (finalError) {
        throw new WorkflowError(`${moduleName} load failed. Install it to use the Vercel provider. Original error: ${finalError instanceof Error ? finalError.message : finalError}`)
      }
    }
  }
}

function resolveProvider(provider?: WorkflowProviderOptions): WorkflowProviderOptions {
  if (provider)
    return provider

  if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
    return { name: 'cloudflare', binding: undefined as unknown as CloudflareWorkflowProviderOptions['binding'] }
  if (envProvider === 'vercel')
    return { name: 'vercel', workflow: undefined as unknown as VercelWorkflowProviderOptions['workflow'] }

  if (typeof process !== 'undefined') {
    if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
      return { name: 'cloudflare', binding: undefined as unknown as CloudflareWorkflowProviderOptions['binding'] }
    if (process.env.VERCEL || process.env.VERCEL_ENV)
      return { name: 'vercel', workflow: undefined as unknown as VercelWorkflowProviderOptions['workflow'] }
  }

  throw new WorkflowError('Unable to auto-detect workflow provider. Pass { provider }.')
}

export async function createWorkflow(options: WorkflowOptions = {}): Promise<WorkflowClient> {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'vercel') {
    const { workflow } = resolved as VercelWorkflowProviderOptions
    if (!workflow) {
      throw new WorkflowError('Vercel workflow definition is required. Pass { provider: { name: "vercel", workflow } }.')
    }
    const api = await loadVercelWorkflowApi()
    return new VercelWorkflowAdapter(workflow, api)
  }

  if (resolved.name === 'cloudflare') {
    const { binding } = resolved as CloudflareWorkflowProviderOptions
    assertCloudflareBinding(binding)
    return new CloudflareWorkflowAdapter(binding)
  }

  if (resolved.name === 'openworkflow') {
    const { workflow, ow, getRun } = resolved as OpenWorkflowProviderOptions
    if (!workflow) {
      throw new WorkflowError('OpenWorkflow workflow definition is required. Pass { provider: { name: \"openworkflow\", workflow } }.')
    }
    return new OpenWorkflowAdapter(workflow, { ow, getRun })
  }

  throw new WorkflowError(`Unknown workflow provider: ${(resolved as { name: string }).name}`)
}

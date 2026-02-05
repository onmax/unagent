import type { WorkflowClient, WorkflowDetectionResult, WorkflowOptions, WorkflowProvider, WorkflowProviderOptions } from './types'
import type { CloudflareWorkflowProviderOptions } from './types/cloudflare'
import type { OpenWorkflowProviderOptions } from './types/openworkflow'
import type { VercelWorkflowAPI, VercelWorkflowProviderOptions } from './types/vercel'
import { provider as envProvider, isWorkerd } from 'std-env'
import { assertCloudflareBinding, CloudflareWorkflowAdapter, OpenWorkflowAdapter, VercelWorkflowAdapter } from './adapters'
import { WorkflowError } from './errors'

export { NotSupportedError, WorkflowError } from './errors'
export type { WorkflowBatchItem, WorkflowCapabilities, WorkflowClient, WorkflowDetectionResult, WorkflowOptions, WorkflowProvider, WorkflowProviderOptions, WorkflowResultOptions, WorkflowRun, WorkflowRunState, WorkflowRunStatus, WorkflowStartOptions } from './types'
export type { CloudflareWorkflowBindingLike, CloudflareWorkflowInstanceLike, CloudflareWorkflowNamespace, CloudflareWorkflowProviderOptions, CloudflareWorkflowStatusLike } from './types/cloudflare'
export type { OpenWorkflowNamespace, OpenWorkflowProviderOptions, OpenWorkflowRunLike, OpenWorkflowWorkflowLike } from './types/openworkflow'
export type { VercelWorkflowAPI, VercelWorkflowNamespace, VercelWorkflowProviderOptions, VercelWorkflowRunLike, VercelWorkflowStartOptions } from './types/vercel'

export function detectWorkflow(): WorkflowDetectionResult {
  if (process.env.CLOUDFLARE_WORKER)
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (process.env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (process.env.VERCEL || process.env.VERCEL_ENV)
    return { type: 'vercel', details: { env: process.env.VERCEL_ENV } }
  return { type: 'none' }
}

export function isWorkflowAvailable(provider: WorkflowProvider): boolean {
  if (provider === 'vercel') {
    try {
      const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
      if (!resolver)
        return false
      resolver('workflow/api')
      return true
    }
    catch {
      return false
    }
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
    try {
      const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
      if (!resolver)
        return false
      resolver('openworkflow')
      return true
    }
    catch {
      return false
    }
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
  const dynamicImport = (specifier: string): Promise<unknown> => {
    // eslint-disable-next-line no-new-func
    const loader = new Function('s', 'return import(s)') as (s: string) => Promise<unknown>
    return loader(specifier)
  }
  try {
    return await dynamicImport('workflow/api') as VercelWorkflowAPI
  }
  catch {
    try {
      return await dynamicImport('workflow/dist/api.js') as VercelWorkflowAPI
    }
    catch {
      try {
        const resolved = await resolveModulePath(moduleName)
        return await dynamicImport(resolved) as VercelWorkflowAPI
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

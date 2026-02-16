import type { NetlifyUpstreamSdk } from '../_internal/netlify-upstream-types'
import type { QueueClient, QueueDetectionResult, QueueOptions, QueueProvider, QueueProviderOptions } from './types'
import type { CloudflareQueueProviderOptions } from './types/cloudflare'
import type { QueueConfigValidationIssue, QueueConfigValidationResult } from './types/common'
import type { MemoryQueueProviderOptions } from './types/memory'
import type { NetlifyQueueProviderOptions } from './types/netlify'
import type { QStashQueueProviderOptions } from './types/qstash'
import type { VercelQueueProviderOptions, VercelQueueSDK } from './types/vercel'
import { provider as envProvider, isWorkerd } from 'std-env'
import { CloudflareQueueAdapter, MemoryQueueAdapter, NetlifyQueueAdapter, QStashQueueAdapter, VercelQueueAdapter } from './adapters'
import { createCloudflareQueueBatchHandler } from './cloudflare-consumer'
import { QueueError } from './errors'
import { verifyQStashSignature } from './qstash'

export { NotSupportedError, QueueError } from './errors'
export { createCloudflareQueueBatchHandler }
export { verifyQStashSignature }
export type { CloudflareQueueClient, MemoryQueueClient, NetlifyQueueClient, QStashQueueClient, QueueClient, VercelQueueClient } from './types'
export type { CloudflareQueueBatchMessage, CloudflareQueueBindingLike, CloudflareQueueContentType, CloudflareQueueMessage, CloudflareQueueMessageBatch, CloudflareQueueNamespace, CloudflareQueueProviderOptions, CloudflareQueueRetryOptions, CloudflareQueueSendBatchOptions, CloudflareQueueSendOptions } from './types/cloudflare'
export type { QueueBatchMessage, QueueCapabilities, QueueConfigValidationIssue, QueueConfigValidationResult, QueueDetectionResult, QueueOptions, QueueProvider, QueueProviderOptions, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from './types/common'
export type { MemoryQueueNamespace, MemoryQueueProviderOptions, MemoryQueueStore, MemoryQueueStoreItem } from './types/memory'
export type { NetlifyAsyncWorkloadsClient, NetlifyClientConstructorOptions, NetlifyQueueNamespace, NetlifyQueueProviderOptions, NetlifyQueueSDK, NetlifyQueueSendEventOptions, NetlifyQueueSendEventResult, NetlifyQueueSendOptions, NetlifyQueueSendResult } from './types/netlify'
export type { QStashQueueNamespace, QStashQueueProviderOptions } from './types/qstash'
export type { VercelQueueHandleCallbackOptions, VercelQueueMessageHandler, VercelQueueNamespace, VercelQueueParsedCallbackRequest, VercelQueueProviderOptions, VercelQueueReceiveOptions, VercelQueueSDK, VercelQueueSendOptions } from './types/vercel'

export function detectQueue(): QueueDetectionResult {
  if (isWorkerd || envProvider === 'cloudflare_workers')
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (envProvider === 'cloudflare_pages')
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (envProvider === 'vercel')
    return { type: 'vercel', details: { env: (typeof process !== 'undefined' ? process.env.VERCEL_ENV : undefined) } }
  if (envProvider === 'netlify')
    return { type: 'netlify', details: { context: (typeof process !== 'undefined' ? process.env.CONTEXT : undefined) } }

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>

  if (env.CLOUDFLARE_WORKER)
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (env.VERCEL || env.VERCEL_ENV)
    return { type: 'vercel', details: { env: env.VERCEL_ENV } }
  if (env.NETLIFY || env.NETLIFY_LOCAL)
    return { type: 'netlify', details: { context: env.CONTEXT } }
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

export function isQueueAvailable(provider: QueueProvider): boolean {
  if (provider === 'cloudflare') {
    if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
      return true
    if (typeof process !== 'undefined') {
      if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
        return true
    }
    return false
  }

  if (provider === 'vercel')
    return canResolve('@vercel/queue')

  if (provider === 'netlify')
    return canResolve('@netlify/async-workloads')

  if (provider === 'qstash')
    return typeof fetch === 'function'

  if (provider === 'memory')
    return true

  return false
}

export function validateQueueConfig(provider: QueueProviderOptions): QueueConfigValidationResult {
  const issues: QueueConfigValidationIssue[] = []

  if (provider.name === 'cloudflare') {
    if (!provider.binding) {
      issues.push({
        code: 'CF_BINDING_REQUIRED',
        field: 'binding',
        message: 'Cloudflare queue requires a Queue binding.',
        severity: 'error',
      })
    }
  }

  if (provider.name === 'vercel') {
    if (!provider.topic) {
      issues.push({
        code: 'VERCEL_TOPIC_REQUIRED',
        field: 'topic',
        message: 'Vercel queue topic is required.',
        severity: 'error',
      })
    }
  }

  if (provider.name === 'qstash') {
    if (!provider.token) {
      issues.push({
        code: 'QSTASH_TOKEN_REQUIRED',
        field: 'token',
        message: '[qstash] token is required',
        severity: 'error',
      })
    }
    if (!provider.destination) {
      issues.push({
        code: 'QSTASH_DESTINATION_MISSING',
        field: 'destination',
        message: '[qstash] destination is required for publish operations',
        severity: 'warning',
      })
    }
  }

  if (provider.name === 'netlify') {
    if (!provider.event) {
      issues.push({
        code: 'NETLIFY_EVENT_REQUIRED',
        field: 'event',
        message: 'Netlify queue event is required.',
        severity: 'error',
      })
    }
  }

  return {
    provider: provider.name,
    ok: issues.every(issue => issue.severity !== 'error'),
    issues,
  }
}

async function loadVercelQueue(): Promise<VercelQueueSDK> {
  const moduleName = '@vercel/queue'
  try {
    return await import('@vercel/queue') as VercelQueueSDK
  }
  catch (e) {
    throw new QueueError(`${moduleName} load failed. Install it to use the Vercel provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

async function loadNetlifyQueue(): Promise<NetlifyUpstreamSdk> {
  const moduleName = '@netlify/async-workloads'
  try {
    return await import('@netlify/async-workloads') as NetlifyUpstreamSdk
  }
  catch (e) {
    throw new QueueError(`${moduleName} load failed. Install it to use the Netlify provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

function resolveProvider(provider?: QueueProviderOptions): QueueProviderOptions {
  if (provider)
    return provider

  if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
    return { name: 'cloudflare', binding: undefined as unknown as CloudflareQueueProviderOptions['binding'] }
  if (envProvider === 'vercel')
    return { name: 'vercel', topic: undefined as unknown as VercelQueueProviderOptions['topic'] }
  if (envProvider === 'netlify')
    return { name: 'netlify', event: undefined as unknown as NetlifyQueueProviderOptions['event'] }

  if (typeof process !== 'undefined') {
    if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
      return { name: 'cloudflare', binding: undefined as unknown as CloudflareQueueProviderOptions['binding'] }
    if (process.env.VERCEL || process.env.VERCEL_ENV)
      return { name: 'vercel', topic: undefined as unknown as VercelQueueProviderOptions['topic'] }
    if (process.env.NETLIFY || process.env.NETLIFY_LOCAL)
      return { name: 'netlify', event: undefined as unknown as NetlifyQueueProviderOptions['event'] }
  }

  throw new QueueError('Unable to auto-detect queue provider. Pass { provider }.')
}

export function createQueue(opts: { provider: VercelQueueProviderOptions }): Promise<QueueClient<'vercel'>>
export function createQueue(opts: { provider: CloudflareQueueProviderOptions }): Promise<QueueClient<'cloudflare'>>
export function createQueue(opts: { provider: QStashQueueProviderOptions }): Promise<QueueClient<'qstash'>>
export function createQueue(opts: { provider: MemoryQueueProviderOptions }): Promise<QueueClient<'memory'>>
export function createQueue(opts: { provider: NetlifyQueueProviderOptions }): Promise<QueueClient<'netlify'>>
export function createQueue(opts?: QueueOptions): Promise<QueueClient>
export async function createQueue(options: QueueOptions = {}): Promise<QueueClient> {
  const resolved = resolveProvider(options.provider)
  const validation = validateQueueConfig(resolved)
  if (!validation.ok) {
    const firstIssue = validation.issues.find(issue => issue.severity === 'error') || validation.issues[0]
    throw new QueueError(firstIssue?.message || 'Invalid queue config', {
      code: firstIssue?.code || 'QUEUE_CONFIG_INVALID',
      provider: resolved.name,
      httpStatus: 400,
      details: { issues: validation.issues },
    })
  }

  if (resolved.name === 'cloudflare') {
    const { binding } = resolved as CloudflareQueueProviderOptions
    return new CloudflareQueueAdapter(binding)
  }

  if (resolved.name === 'vercel') {
    const { topic } = resolved as VercelQueueProviderOptions
    const sdk = await loadVercelQueue()
    return new VercelQueueAdapter(topic, sdk)
  }

  if (resolved.name === 'qstash') {
    const { token, destination, apiUrl } = resolved as QStashQueueProviderOptions
    return new QStashQueueAdapter(token, destination, apiUrl)
  }

  if (resolved.name === 'memory') {
    const { store } = resolved as MemoryQueueProviderOptions
    return new MemoryQueueAdapter(store)
  }

  if (resolved.name === 'netlify') {
    const sdk = await loadNetlifyQueue()
    return new NetlifyQueueAdapter(resolved as NetlifyQueueProviderOptions, sdk)
  }

  throw new QueueError(`Unknown queue provider: ${(resolved as { name: string }).name}`)
}

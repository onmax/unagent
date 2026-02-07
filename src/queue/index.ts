import type { QueueClient, QueueDetectionResult, QueueOptions, QueueProvider, QueueProviderOptions } from './types'
import type { CloudflareQueueProviderOptions } from './types/cloudflare'
import type { MemoryQueueProviderOptions } from './types/memory'
import type { QStashQueueProviderOptions } from './types/qstash'
import type { VercelQueueProviderOptions, VercelQueueSDK } from './types/vercel'
import { provider as envProvider, isWorkerd } from 'std-env'
import { CloudflareQueueAdapter, MemoryQueueAdapter, QStashQueueAdapter, VercelQueueAdapter } from './adapters'
import { createCloudflareQueueBatchHandler } from './cloudflare-consumer'
import { QueueError } from './errors'
import { verifyQStashSignature } from './qstash'

export { NotSupportedError, QueueError } from './errors'
export { createCloudflareQueueBatchHandler }
export { verifyQStashSignature }
export type { CloudflareQueueClient, MemoryQueueClient, QStashQueueClient, QueueClient, VercelQueueClient } from './types'
export type { CloudflareQueueBatchMessage, CloudflareQueueBindingLike, CloudflareQueueContentType, CloudflareQueueMessage, CloudflareQueueMessageBatch, CloudflareQueueNamespace, CloudflareQueueProviderOptions, CloudflareQueueRetryOptions, CloudflareQueueSendBatchOptions, CloudflareQueueSendOptions } from './types/cloudflare'
export type { QueueBatchMessage, QueueCapabilities, QueueDetectionResult, QueueOptions, QueueProvider, QueueProviderOptions, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from './types/common'
export type { MemoryQueueNamespace, MemoryQueueProviderOptions, MemoryQueueStore, MemoryQueueStoreItem } from './types/memory'
export type { QStashQueueNamespace, QStashQueueProviderOptions } from './types/qstash'
export type { VercelQueueHandleCallbackOptions, VercelQueueMessageHandler, VercelQueueNamespace, VercelQueueParsedCallbackRequest, VercelQueueProviderOptions, VercelQueueReceiveOptions, VercelQueueSDK, VercelQueueSendOptions } from './types/vercel'

export function detectQueue(): QueueDetectionResult {
  if (process.env.CLOUDFLARE_WORKER)
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (process.env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (process.env.VERCEL || process.env.VERCEL_ENV)
    return { type: 'vercel', details: { env: process.env.VERCEL_ENV } }
  return { type: 'none' }
}

function canResolve(moduleName: string): boolean {
  try {
    const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
    if (!resolver)
      return false
    resolver(moduleName)
    return true
  }
  catch {
    return false
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

  if (provider === 'qstash')
    return typeof fetch === 'function'

  if (provider === 'memory')
    return true

  return false
}

async function loadVercelQueue(): Promise<VercelQueueSDK> {
  const moduleName = '@vercel/queue'
  try {
    return await import(moduleName) as VercelQueueSDK
  }
  catch (e) {
    throw new QueueError(`${moduleName} load failed. Install it to use the Vercel provider. Original error: ${e instanceof Error ? e.message : e}`)
  }
}

function resolveProvider(provider?: QueueProviderOptions): QueueProviderOptions {
  if (provider)
    return provider

  if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
    return { name: 'cloudflare', binding: undefined as unknown as CloudflareQueueProviderOptions['binding'] }
  if (envProvider === 'vercel')
    return { name: 'vercel', topic: undefined as unknown as VercelQueueProviderOptions['topic'] }

  if (typeof process !== 'undefined') {
    if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
      return { name: 'cloudflare', binding: undefined as unknown as CloudflareQueueProviderOptions['binding'] }
    if (process.env.VERCEL || process.env.VERCEL_ENV)
      return { name: 'vercel', topic: undefined as unknown as VercelQueueProviderOptions['topic'] }
  }

  throw new QueueError('Unable to auto-detect queue provider. Pass { provider }.')
}

export function createQueue(opts: { provider: VercelQueueProviderOptions }): Promise<QueueClient<'vercel'>>
export function createQueue(opts: { provider: CloudflareQueueProviderOptions }): Promise<QueueClient<'cloudflare'>>
export function createQueue(opts: { provider: QStashQueueProviderOptions }): Promise<QueueClient<'qstash'>>
export function createQueue(opts: { provider: MemoryQueueProviderOptions }): Promise<QueueClient<'memory'>>
export function createQueue(opts?: QueueOptions): Promise<QueueClient>
export async function createQueue(options: QueueOptions = {}): Promise<QueueClient> {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'cloudflare') {
    const { binding } = resolved as CloudflareQueueProviderOptions
    if (!binding)
      throw new QueueError('Cloudflare queue requires a Queue binding. Pass { provider: { name: "cloudflare", binding } }.')
    return new CloudflareQueueAdapter(binding)
  }

  if (resolved.name === 'vercel') {
    const { topic } = resolved as VercelQueueProviderOptions
    if (!topic)
      throw new QueueError('Vercel queue topic is required. Pass { provider: { name: "vercel", topic } }.')
    const sdk = await loadVercelQueue()
    return new VercelQueueAdapter(topic, sdk)
  }

  if (resolved.name === 'qstash') {
    const { token, destination, apiUrl } = resolved as QStashQueueProviderOptions
    if (!token)
      throw new QueueError('[qstash] token is required')
    if (!destination)
      throw new QueueError('[qstash] destination is required')
    return new QStashQueueAdapter(token, destination, apiUrl)
  }

  if (resolved.name === 'memory') {
    const { store } = resolved as MemoryQueueProviderOptions
    return new MemoryQueueAdapter(store)
  }

  throw new QueueError(`Unknown queue provider: ${(resolved as { name: string }).name}`)
}

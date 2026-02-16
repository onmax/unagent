import { createQueue } from 'unagent/queue'
import { getCloudflareEnv } from './provider'

export type QueueProvider = 'cloudflare' | 'vercel' | 'netlify' | 'qstash' | 'memory'

export const VERCEL_QUEUE_TOPIC = 'unagent-playground'
export const VERCEL_QUEUE_CONSUMER = 'playground'
export const NETLIFY_QUEUE_EVENT_ENV = 'NETLIFY_QUEUE_EVENT'
export const NETLIFY_QUEUE_DEFAULT_EVENT = 'unagent.playground.queue'

const memoryStore = { messages: [] as any[] }

export function getPlaygroundNetlifyQueueConfig(): { event: string, baseUrl?: string } {
  const event = (process.env[NETLIFY_QUEUE_EVENT_ENV] || NETLIFY_QUEUE_DEFAULT_EVENT).trim()
  const baseUrl = process.env.NETLIFY_ASYNC_WORKLOADS_BASE_URL

  return {
    event: event || NETLIFY_QUEUE_DEFAULT_EVENT,
    ...(baseUrl ? { baseUrl } : {}),
  }
}

export async function createPlaygroundQueue(event: any, provider: QueueProvider, extra?: { destination?: string }): Promise<{ provider: string, queue: any }> {
  if (provider === 'cloudflare') {
    const env = getCloudflareEnv(event)
    if (!env)
      throw new Error('Missing Cloudflare env bindings')
    return {
      provider,
      queue: await createQueue({ provider: { name: 'cloudflare', binding: env.MY_QUEUE } }),
    }
  }

  if (provider === 'vercel') {
    return {
      provider,
      queue: await createQueue({ provider: { name: 'vercel', topic: VERCEL_QUEUE_TOPIC } }),
    }
  }

  if (provider === 'qstash') {
    const token = process.env.QSTASH_TOKEN
    if (!token)
      throw new Error('Missing QSTASH_TOKEN')
    const destination = extra?.destination || process.env.QSTASH_DESTINATION
    const apiUrl = process.env.QSTASH_API_URL
    return {
      provider,
      queue: await createQueue({ provider: { name: 'qstash', token, destination, ...(apiUrl ? { apiUrl } : {}) } }),
    }
  }

  if (provider === 'netlify') {
    const config = getPlaygroundNetlifyQueueConfig()

    const apiKey = process.env.NETLIFY_API_KEY || process.env.NETLIFY_AUTH_TOKEN

    return {
      provider,
      queue: await createQueue({
        provider: {
          name: 'netlify',
          event: config.event,
          ...(apiKey ? { apiKey } : {}),
          ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
        },
      }),
    }
  }

  return {
    provider,
    queue: await createQueue({ provider: { name: 'memory', store: memoryStore } }),
  }
}

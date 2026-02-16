import { getRequestURL } from 'h3'
import { createQueue } from 'unagent/queue'
import { getCloudflareEnv } from './provider'

export type QueueProvider = 'cloudflare' | 'vercel' | 'netlify' | 'qstash' | 'memory'

export const VERCEL_QUEUE_TOPIC = 'unagent-playground'
export const VERCEL_QUEUE_CONSUMER = 'playground'
export const NETLIFY_QUEUE_EVENT_ENV = 'NETLIFY_QUEUE_EVENT'

const memoryStore = { messages: [] as any[] }

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
    const eventName = process.env.NETLIFY_QUEUE_EVENT
    if (!eventName)
      throw new Error(`Missing ${NETLIFY_QUEUE_EVENT_ENV}`)

    const apiKey = process.env.NETLIFY_API_KEY || process.env.NETLIFY_AUTH_TOKEN
    const baseUrl = process.env.NETLIFY_ASYNC_WORKLOADS_BASE_URL || getRequestURL(event).origin

    return {
      provider,
      queue: await createQueue({
        provider: {
          name: 'netlify',
          event: eventName,
          ...(apiKey ? { apiKey } : {}),
          ...(baseUrl ? { baseUrl } : {}),
        },
      }),
    }
  }

  return {
    provider,
    queue: await createQueue({ provider: { name: 'memory', store: memoryStore } }),
  }
}

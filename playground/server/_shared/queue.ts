import { createQueue } from 'unagent/queue'
import { getCloudflareEnv, getProvider } from './provider'

export const VERCEL_QUEUE_TOPIC = 'unagent-playground'
export const VERCEL_QUEUE_CONSUMER = 'playground'

const memoryStore = { messages: [] as any[] }

export async function createPlaygroundQueue(event: any): Promise<{ provider: string, queue: any }> {
  const provider = getProvider(event)
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

  return {
    provider,
    queue: await createQueue({ provider: { name: 'memory', store: memoryStore } }),
  }
}

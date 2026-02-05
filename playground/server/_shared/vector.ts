import type { VectorDocument, VectorSearchOptions } from 'unagent/vector'
import { createCloudflareVectorAdapter } from 'unagent/vector/adapters/cloudflare'
import { getCloudflareEnv, getProvider } from './provider'

const VECTOR_DIMENSIONS = 32

export const DEFAULT_VECTOR_DOCS: VectorDocument[] = [
  { id: 'doc-1', content: 'Hello world from Unagent vector demo.', metadata: { tag: 'demo', source: 'playground' } },
  { id: 'doc-2', content: 'Vector search lets you find similar text quickly.', metadata: { tag: 'demo', source: 'playground' } },
  { id: 'doc-3', content: 'Cloudflare Vectorize works great with Workers.', metadata: { tag: 'cloudflare', source: 'playground' } },
]

function hashToVector(text: string): number[] {
  const vec = new Float32Array(VECTOR_DIMENSIONS)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    const idx = i % VECTOR_DIMENSIONS
    vec[idx] += (code % 31) / 31
  }
  let norm = 0
  for (let i = 0; i < vec.length; i++)
    norm += vec[i] * vec[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < vec.length; i++)
    vec[i] = vec[i] / norm
  return Array.from(vec)
}

const embeddings = {
  async resolve() {
    return {
      embedder: async (texts: string[]) => texts.map(hashToVector),
      dimensions: VECTOR_DIMENSIONS,
    }
  },
}

let vectorClient: ReturnType<typeof createCloudflareVectorAdapter> | null = null

export function getCloudflareVector(event: any): ReturnType<typeof createCloudflareVectorAdapter> {
  const provider = getProvider(event)
  if (provider !== 'cloudflare')
    throw new Error('Vectorize is only available on Cloudflare')

  const env = getCloudflareEnv(event)
  if (!env)
    throw new Error('Missing Cloudflare env bindings')

  if (!vectorClient)
    vectorClient = createCloudflareVectorAdapter(env.VECTORIZE, embeddings)

  return vectorClient
}

export type { VectorDocument, VectorSearchOptions }

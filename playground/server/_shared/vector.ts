import type { VectorClient, VectorDocument, VectorSearchOptions } from 'unagent/vector'
import { createVector } from 'unagent/vector'
import { getCloudflareEnv } from './provider'

export type VectorProvider = 'cloudflare' | 'upstash' | 'pinecone' | 'qdrant' | 'weaviate' | 'pgvector' | 'libsql' | 'sqlite-vec'

const HASH_DIMENSIONS = 32

export const DEFAULT_VECTOR_DOCS: VectorDocument[] = [
  { id: 'doc-1', content: 'Hello world from Unagent vector demo.', metadata: { tag: 'demo', source: 'playground' } },
  { id: 'doc-2', content: 'Vector search lets you find similar text quickly.', metadata: { tag: 'demo', source: 'playground' } },
  { id: 'doc-3', content: 'Cloudflare Vectorize works great with Workers.', metadata: { tag: 'cloudflare', source: 'playground' } },
]

function hashToVector(text: string, dims: number): number[] {
  const vec = new Float32Array(dims)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    vec[i % dims] += (code % 31) / 31
  }
  let norm = 0
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm
  return Array.from(vec)
}

function dummyHashEmbeddings(dims: number): { resolve: () => Promise<{ embedder: (texts: string[]) => Promise<number[][]>, dimensions: number }> } {
  return {
    async resolve() {
      return {
        embedder: async (texts: string[]) => texts.map(t => hashToVector(t, dims)),
        dimensions: dims,
      }
    },
  }
}

function resolveEmbeddings(embeddingsParam?: string): { resolve: () => Promise<{ embedder: (texts: string[]) => Promise<number[][]>, dimensions: number }> } {
  if (!embeddingsParam || embeddingsParam === 'dummy-hash')
    return dummyHashEmbeddings(HASH_DIMENSIONS)

  // Dynamic import from unagent/vector/embeddings
  return {
    async resolve() {
      const mod = await import(`unagent/vector/embeddings/${embeddingsParam}`)
      const factory = mod[embeddingsParam] || mod.default
      if (typeof factory !== 'function')
        throw new Error(`Embeddings provider "${embeddingsParam}" not found`)
      const config = factory()
      return config.resolve()
    },
  }
}

export async function createPlaygroundVector(event: any, provider: VectorProvider, opts?: { embeddings?: string }): Promise<{ provider: string, vector: VectorClient }> {
  const embeddings = resolveEmbeddings(opts?.embeddings)

  if (provider === 'cloudflare') {
    const env = getCloudflareEnv(event)
    if (!env)
      throw new Error('Missing Cloudflare env bindings')
    return { provider, vector: await createVector({ provider: { name: 'cloudflare', binding: env.VECTORIZE, embeddings } }) }
  }

  if (provider === 'upstash') {
    const url = process.env.UPSTASH_VECTOR_URL
    const token = process.env.UPSTASH_VECTOR_TOKEN
    if (!url || !token)
      throw new Error('Missing UPSTASH_VECTOR_URL or UPSTASH_VECTOR_TOKEN')
    return { provider, vector: await createVector({ provider: { name: 'upstash', url, token } }) }
  }

  if (provider === 'pinecone') {
    const apiKey = process.env.PINECONE_API_KEY
    const host = process.env.PINECONE_HOST
    const index = process.env.PINECONE_INDEX
    if (!apiKey)
      throw new Error('Missing PINECONE_API_KEY')
    if (!host && !index)
      throw new Error('Missing PINECONE_HOST or PINECONE_INDEX')
    return { provider, vector: await createVector({ provider: { name: 'pinecone', apiKey, host, index, embeddings } }) }
  }

  if (provider === 'qdrant') {
    const url = process.env.QDRANT_URL
    if (!url)
      throw new Error('Missing QDRANT_URL')
    return { provider, vector: await createVector({ provider: { name: 'qdrant', url, embeddings } }) }
  }

  if (provider === 'weaviate') {
    const url = process.env.WEAVIATE_URL
    if (!url)
      throw new Error('Missing WEAVIATE_URL')
    return { provider, vector: await createVector({ provider: { name: 'weaviate', url, embeddings } }) }
  }

  if (provider === 'pgvector') {
    const url = process.env.DATABASE_URL
    if (!url)
      throw new Error('Missing DATABASE_URL')
    return { provider, vector: await createVector({ provider: { name: 'pgvector', url, embeddings } }) }
  }

  if (provider === 'libsql') {
    const url = process.env.LIBSQL_URL
    if (!url)
      throw new Error('Missing LIBSQL_URL')
    const authToken = process.env.LIBSQL_AUTH_TOKEN
    return { provider, vector: await createVector({ provider: { name: 'libsql', url, ...(authToken ? { authToken } : {}), embeddings } }) }
  }

  if (provider === 'sqlite-vec') {
    return { provider, vector: await createVector({ provider: { name: 'sqlite-vec', embeddings } }) }
  }

  throw new Error(`Vector provider "${provider}" is not supported`)
}

export type { VectorDocument, VectorSearchOptions }

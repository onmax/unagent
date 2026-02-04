import type { EmbeddingConfig } from './common'

export interface PineconeIndexLike {
  upsert: (opts: { records: Array<{ id: string, values: number[], metadata?: Record<string, any> }>, namespace?: string }) => Promise<void>
  query: (opts: { vector: number[], topK: number, includeMetadata?: boolean, includeValues?: boolean, namespace?: string, filter?: Record<string, any> }) => Promise<{ matches?: Array<{ id: string, score?: number, metadata?: Record<string, any> }> }>
  deleteMany: (opts: { ids?: string[], filter?: Record<string, any>, namespace?: string }) => Promise<void>
  deleteAll: (opts?: { namespace?: string }) => Promise<void>
}

export interface PineconeProviderOptions {
  name: 'pinecone'
  apiKey?: string
  host?: string
  index?: string
  namespace?: string
  embeddings: EmbeddingConfig
}

export interface PineconeNamespace {
  index: PineconeIndexLike
  namespace?: string
}

import type { CloudflareVectorProviderOptions } from './types/cloudflare'
import type { LibsqlProviderOptions } from './types/libsql'
import type { PgvectorProviderOptions } from './types/pgvector'
import type { PineconeProviderOptions } from './types/pinecone'
import type { QdrantProviderOptions } from './types/qdrant'
import type { SqliteVecProviderOptions } from './types/sqlite-vec'
import type { UpstashVectorProviderOptions } from './types/upstash'
import type { WeaviateProviderOptions } from './types/weaviate'

export type VectorProviderName = 'cloudflare' | 'upstash' | 'pgvector' | 'libsql' | 'sqlite-vec' | 'pinecone' | 'qdrant' | 'weaviate'

export interface VectorProviderOptionsMap {
  'cloudflare': CloudflareVectorProviderOptions
  'upstash': UpstashVectorProviderOptions
  'pgvector': PgvectorProviderOptions
  'libsql': LibsqlProviderOptions
  'sqlite-vec': SqliteVecProviderOptions
  'pinecone': PineconeProviderOptions
  'qdrant': QdrantProviderOptions
  'weaviate': WeaviateProviderOptions
}

export const vectorProviders: Record<VectorProviderName, string> = Object.freeze({
  'cloudflare': 'unagent/vector/adapters/cloudflare',
  'upstash': 'unagent/vector/adapters/upstash',
  'pgvector': 'unagent/vector/adapters/pgvector',
  'libsql': 'unagent/vector/adapters/libsql',
  'sqlite-vec': 'unagent/vector/adapters/sqlite-vec',
  'pinecone': 'unagent/vector/adapters/pinecone',
  'qdrant': 'unagent/vector/adapters/qdrant',
  'weaviate': 'unagent/vector/adapters/weaviate',
} as const)

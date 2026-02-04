import type { CloudflareVectorProviderOptions } from './cloudflare'
import type { LibsqlProviderOptions } from './libsql'
import type { PgvectorProviderOptions } from './pgvector'
import type { PineconeProviderOptions } from './pinecone'
import type { QdrantProviderOptions } from './qdrant'
import type { SqliteVecProviderOptions } from './sqlite-vec'
import type { UpstashVectorProviderOptions } from './upstash'
import type { WeaviateProviderOptions } from './weaviate'

export type * from './cloudflare'
export type * from './common'
export type * from './libsql'
export type * from './pgvector'
export type * from './pinecone'
export type * from './qdrant'
export type * from './sqlite-vec'
export type * from './upstash'
export type * from './weaviate'

export type VectorProviderOptions
  = | CloudflareVectorProviderOptions
    | UpstashVectorProviderOptions
    | PgvectorProviderOptions
    | LibsqlProviderOptions
    | SqliteVecProviderOptions
    | PineconeProviderOptions
    | QdrantProviderOptions
    | WeaviateProviderOptions

export interface VectorOptions {
  provider?: VectorProviderOptions
}

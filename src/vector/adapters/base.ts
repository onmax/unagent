import type { VectorCapabilities, VectorClient, VectorDocument, VectorProvider, VectorSearchOptions, VectorSearchResult } from '../types'
import type { CloudflareVectorNamespace } from '../types/cloudflare'
import type { LibsqlNamespace } from '../types/libsql'
import type { PgvectorNamespace } from '../types/pgvector'
import type { PineconeNamespace } from '../types/pinecone'
import type { QdrantNamespace } from '../types/qdrant'
import type { SqliteVecNamespace } from '../types/sqlite-vec'
import type { UpstashVectorNamespace } from '../types/upstash'
import type { WeaviateNamespace } from '../types/weaviate'
import { NotSupportedError } from '../errors'

export abstract class BaseVectorAdapter implements VectorClient {
  abstract readonly provider: VectorProvider
  abstract readonly supports: VectorCapabilities

  abstract index(docs: VectorDocument[]): Promise<{ count: number }>
  abstract search(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>

  async remove(_ids: string[]): Promise<{ count: number }> {
    throw new NotSupportedError('remove', this.provider)
  }

  async clear(): Promise<void> {
    throw new NotSupportedError('clear', this.provider)
  }

  async close(): Promise<void> {
    throw new NotSupportedError('close', this.provider)
  }

  get cloudflare(): CloudflareVectorNamespace {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }

  get upstash(): UpstashVectorNamespace {
    throw new NotSupportedError('upstash namespace', this.provider)
  }

  get pgvector(): PgvectorNamespace {
    throw new NotSupportedError('pgvector namespace', this.provider)
  }

  get libsql(): LibsqlNamespace {
    throw new NotSupportedError('libsql namespace', this.provider)
  }

  get sqliteVec(): SqliteVecNamespace {
    throw new NotSupportedError('sqlite-vec namespace', this.provider)
  }

  get pinecone(): PineconeNamespace {
    throw new NotSupportedError('pinecone namespace', this.provider)
  }

  get qdrant(): QdrantNamespace {
    throw new NotSupportedError('qdrant namespace', this.provider)
  }

  get weaviate(): WeaviateNamespace {
    throw new NotSupportedError('weaviate namespace', this.provider)
  }
}

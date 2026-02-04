import type { EmbeddingConfig } from './common'

export type QdrantDistance = 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan'

export interface QdrantClientLike {
  getCollection: (name: string) => Promise<any>
  createCollection: (name: string, opts: any) => Promise<any>
  upsert: (name: string, opts: any) => Promise<any>
  search: (name: string, opts: any) => Promise<any[]>
  delete: (name: string, opts: any) => Promise<any>
  deleteCollection: (name: string) => Promise<any>
}

export interface QdrantProviderOptions {
  name: 'qdrant'
  url?: string
  host?: string
  port?: number
  apiKey?: string
  collection?: string
  distance?: QdrantDistance
  embeddings: EmbeddingConfig
}

export interface QdrantNamespace {
  client: QdrantClientLike
  collection: string
}

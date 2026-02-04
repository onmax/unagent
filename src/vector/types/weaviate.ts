import type { EmbeddingConfig } from './common'

export interface WeaviateCollectionLike {
  data: {
    insertMany: (objects: any[]) => Promise<any>
    deleteById: (id: string) => Promise<boolean>
  }
  query: {
    nearVector: (vector: number[], opts?: any) => Promise<{ objects: any[] }>
  }
  exists: () => Promise<boolean>
}

export interface WeaviateClientLike {
  collections: {
    exists: (name: string) => Promise<boolean>
    create: (config: any) => Promise<any>
    delete: (name: string) => Promise<void>
    get: (name: string) => WeaviateCollectionLike
  }
  close: () => Promise<void>
}

export interface WeaviateProviderOptions {
  name: 'weaviate'
  url?: string
  host?: string
  port?: number
  grpcPort?: number
  apiKey?: string
  collection?: string
  skipInitChecks?: boolean
  embeddings: EmbeddingConfig
}

export interface WeaviateNamespace {
  client: WeaviateClientLike
  collection: string
}

import type { EmbeddingConfig } from './common'

export type VectorFloatArray = Float32Array | Float64Array
export type VectorizeVectorMetadata = string | number | boolean | string[]

export interface VectorizeVector {
  id: string
  values: VectorFloatArray | number[]
  namespace?: string
  metadata?: Record<string, VectorizeVectorMetadata>
}

export interface VectorizeMatch {
  id: string
  score: number
  values?: number[]
  namespace?: string
  metadata?: Record<string, VectorizeVectorMetadata>
}

export interface VectorizeIndexBinding {
  query: (vector: number[], options?: any) => Promise<{ matches: VectorizeMatch[], count?: number }>
  insert: (vectors: VectorizeVector[]) => Promise<void>
  upsert: (vectors: VectorizeVector[]) => Promise<void>
  deleteByIds: (ids: string[]) => Promise<void>
}

export interface CloudflareVectorProviderOptions {
  name: 'cloudflare'
  binding: VectorizeIndexBinding
  embeddings: EmbeddingConfig
}

export interface CloudflareVectorNamespace {
  binding: VectorizeIndexBinding
}

export type VectorProvider = 'cloudflare' | 'upstash' | 'pgvector' | 'libsql' | 'sqlite-vec' | 'pinecone' | 'qdrant' | 'weaviate'

export interface VectorDocument {
  id: string
  content: string
  metadata?: Record<string, any>
}

export interface VectorSearchMeta {
  bm25Score?: number
  highlights?: string[]
  distance?: number
  vector?: number[]
  matches?: Array<{ indices: [number, number][], value: string }>
  [key: string]: any
}

export interface VectorSearchResult {
  id: string
  score: number
  content?: string
  metadata?: Record<string, any>
  _meta?: VectorSearchMeta
}

export type FilterOperator
  = | { $eq: string | number | boolean }
    | { $ne: string | number | boolean }
    | { $gt: number }
    | { $gte: number }
    | { $lt: number }
    | { $lte: number }
    | { $in: (string | number)[] }
    | { $prefix: string }
    | { $exists: boolean }

export type FilterValue = string | number | boolean | FilterOperator

export type VectorSearchFilter = Record<string, FilterValue>

export interface VectorSearchOptions {
  limit?: number
  returnContent?: boolean
  returnMetadata?: boolean
  returnMeta?: boolean
  filter?: VectorSearchFilter
}

export interface VectorCapabilities {
  remove: boolean
  clear: boolean
  close: boolean
  filter: boolean
}

export interface VectorClient {
  readonly provider: VectorProvider
  readonly supports: VectorCapabilities
  index: (docs: VectorDocument[]) => Promise<{ count: number }>
  search: (query: string, options?: VectorSearchOptions) => Promise<VectorSearchResult[]>
  remove?: (ids: string[]) => Promise<{ count: number }>
  clear?: () => Promise<void>
  close?: () => Promise<void>
}

export interface VectorDetectionResult {
  type: VectorProvider | 'none'
  details?: Record<string, unknown>
}

export type EmbeddingProvider = (texts: string[]) => Promise<number[][]>

export interface ResolvedEmbedding {
  embedder: EmbeddingProvider
  dimensions: number
}

export interface EmbeddingConfig {
  resolve: () => Promise<ResolvedEmbedding>
}

export interface VectorConfigValidationIssue {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning'
}

export interface VectorConfigValidationResult {
  provider: VectorProvider
  ok: boolean
  issues: VectorConfigValidationIssue[]
}

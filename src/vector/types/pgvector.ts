import type { EmbeddingConfig } from './common'

export type PgDistanceMetric = 'cosine' | 'euclidean' | 'inner_product'

export interface PgQueryResult {
  rows: any[]
}

export interface PgPoolLike {
  query: (sql: string, params?: any[]) => Promise<PgQueryResult>
  end: () => Promise<void>
}

export interface PgvectorProviderOptions {
  name: 'pgvector'
  url: string
  table?: string
  embeddings: EmbeddingConfig
  metric?: PgDistanceMetric
}

export interface PgvectorNamespace {
  pool: PgPoolLike
}

import type { EmbeddingConfig } from './common'

export interface SqliteStatementLike {
  run: (...params: any[]) => any
  get: (...params: any[]) => any
  all: (...params: any[]) => any[]
}

export interface SqliteDatabaseLike {
  exec: (sql: string) => void
  prepare: (sql: string) => SqliteStatementLike
  close?: () => void
}

export interface SqliteVecProviderOptions {
  name: 'sqlite-vec'
  path?: string
  embeddings: EmbeddingConfig
}

export interface SqliteVecNamespace {
  db: SqliteDatabaseLike
}

import type { EmbeddingConfig } from './common'

export interface LibsqlExecuteResult {
  rows?: any[]
}

export interface LibsqlClientLike {
  execute: (input: string | { sql: string, args?: any[] }) => Promise<LibsqlExecuteResult>
  close: () => void
}

export interface LibsqlProviderOptions {
  name: 'libsql'
  url?: string
  path?: string
  authToken?: string
  embeddings: EmbeddingConfig
}

export interface LibsqlNamespace {
  client: LibsqlClientLike
}

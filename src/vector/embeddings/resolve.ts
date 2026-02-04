import type { EmbeddingConfig, ResolvedEmbedding } from '../types'

export async function resolveEmbedding(config: EmbeddingConfig): Promise<ResolvedEmbedding> {
  return config.resolve()
}

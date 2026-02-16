import type { EmbeddingConfig, EmbeddingProvider, ResolvedEmbedding } from '../types'
import { dynamicImport } from '../../_internal/dynamic-import'
import { getModelDimensions } from './model-info'

export interface GoogleEmbeddingOptions {
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function google(options: GoogleEmbeddingOptions = {}): EmbeddingConfig {
  const { model = 'text-embedding-004', apiKey, baseUrl } = options
  let cached: ResolvedEmbedding | null = null

  return {
    async resolve() {
      if (cached)
        return cached

      const { createGoogleGenerativeAI } = await dynamicImport<typeof import('@ai-sdk/google')>('@ai-sdk/google')
      const { embed, embedMany } = await dynamicImport<typeof import('ai')>('ai')

      const googleClient = createGoogleGenerativeAI({ apiKey, baseURL: baseUrl })
      const embeddingModel = googleClient.textEmbeddingModel(model)

      let dimensions = getModelDimensions(model)
      if (!dimensions) {
        const { embedding } = await embed({ model: embeddingModel, value: 'test' })
        dimensions = embedding.length
      }

      const embedder: EmbeddingProvider = async (texts) => {
        if (texts.length === 0)
          return []
        if (texts.length === 1) {
          const { embedding } = await embed({ model: embeddingModel, value: texts[0] })
          return [embedding]
        }
        const { embeddings } = await embedMany({ model: embeddingModel, values: texts })
        return embeddings
      }

      cached = { embedder, dimensions }
      return cached
    },
  }
}

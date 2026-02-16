import type { EmbeddingConfig, EmbeddingProvider, ResolvedEmbedding } from '../types'
import { dynamicImport } from '../../_internal/dynamic-import'
import { getModelDimensions } from './model-info'

export interface CohereEmbeddingOptions {
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function cohere(options: CohereEmbeddingOptions = {}): EmbeddingConfig {
  const { model = 'embed-english-v3.0', apiKey, baseUrl } = options
  let cached: ResolvedEmbedding | null = null

  return {
    async resolve() {
      if (cached)
        return cached

      const { createCohere } = await dynamicImport<typeof import('@ai-sdk/cohere')>('@ai-sdk/cohere')
      const { embed, embedMany } = await dynamicImport<typeof import('ai')>('ai')

      const cohereClient = createCohere({ apiKey, baseURL: baseUrl })
      const embeddingModel = cohereClient.textEmbeddingModel(model)

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

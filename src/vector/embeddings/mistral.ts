import type { EmbeddingConfig, EmbeddingProvider, ResolvedEmbedding } from '../types'
import { dynamicImport } from '../../_internal/dynamic-import'
import { getModelDimensions } from './model-info'

export interface MistralEmbeddingOptions {
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function mistral(options: MistralEmbeddingOptions = {}): EmbeddingConfig {
  const { model = 'mistral-embed', apiKey, baseUrl } = options
  let cached: ResolvedEmbedding | null = null

  return {
    async resolve() {
      if (cached)
        return cached

      const { createMistral } = await dynamicImport<typeof import('@ai-sdk/mistral')>('@ai-sdk/mistral')
      const { embed, embedMany } = await dynamicImport<typeof import('ai')>('ai')

      const mistralClient = createMistral({ apiKey, baseURL: baseUrl })
      const embeddingModel = mistralClient.textEmbeddingModel(model)

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

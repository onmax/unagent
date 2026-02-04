import type { EmbeddingConfig, EmbeddingProvider, ResolvedEmbedding } from '../types'
import { getModelDimensions } from './model-info'

export interface OpenAIEmbeddingOptions {
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function openai(options: OpenAIEmbeddingOptions = {}): EmbeddingConfig {
  const { model = 'text-embedding-3-small', apiKey, baseUrl } = options
  let cached: ResolvedEmbedding | null = null

  return {
    async resolve() {
      if (cached)
        return cached

      const { createOpenAI } = await import('@ai-sdk/openai')
      const { embed, embedMany } = await import('ai')

      const openaiClient = createOpenAI({ apiKey, baseURL: baseUrl })
      const embeddingModel = openaiClient.textEmbeddingModel(model)

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

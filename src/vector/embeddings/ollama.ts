import type { EmbeddingConfig, EmbeddingProvider, ResolvedEmbedding } from '../types'
import { getModelDimensions } from './model-info'

export interface OllamaEmbeddingOptions {
  model?: string
  baseUrl?: string
}

export function ollama(options: OllamaEmbeddingOptions = {}): EmbeddingConfig {
  const { model = 'nomic-embed-text', baseUrl } = options
  let cached: ResolvedEmbedding | null = null

  return {
    async resolve() {
      if (cached)
        return cached

      const { embed, embedMany } = await import('ai')
      const { createOllama } = await import('ollama-ai-provider-v2')

      const ollamaBaseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      const ollamaClient = createOllama({
        baseURL: ollamaBaseUrl.endsWith('/api') ? ollamaBaseUrl : `${ollamaBaseUrl}/api`,
      })
      const embeddingModel: any = ollamaClient.textEmbeddingModel(model)

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

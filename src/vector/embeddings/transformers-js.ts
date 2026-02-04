import type { EmbeddingConfig, EmbeddingProvider, ResolvedEmbedding } from '../types'
import { rm } from 'node:fs/promises'
import { getModelDimensions, resolveModelForPreset } from './model-info'

export interface TransformersEmbeddingOptions {
  model?: string
  dimensions?: number
}

async function clearCorruptedCache(error: unknown, model: string): Promise<boolean> {
  const isProtobufError = error instanceof Error
    && (error.message?.includes('Protobuf parsing failed') || String(error.cause)?.includes('Protobuf parsing failed'))

  const transformers = await import('@huggingface/transformers')
  const env = transformers.env as { cacheDir?: string }

  if (!isProtobufError || !env.cacheDir)
    return false

  const modelPath = `${env.cacheDir}/${model}`
  await rm(modelPath, { recursive: true, force: true }).catch(() => {})
  console.warn(`[unagent] Cleared corrupted model cache for ${model}, retrying...`)
  return true
}

export function transformersJs(options: TransformersEmbeddingOptions = {}): EmbeddingConfig {
  const baseModel = options.model ?? 'bge-small-en-v1.5'
  const model = resolveModelForPreset(baseModel, 'transformers.js')
  let cached: ResolvedEmbedding | null = null

  return {
    async resolve() {
      if (cached)
        return cached

      const transformers = await import('@huggingface/transformers')
      const pipeline = transformers.pipeline as (task: string, model: string, opts?: Record<string, unknown>) => Promise<any>

      const extractor = await pipeline('feature-extraction', model, { dtype: 'fp32' })
        .catch(async (err) => {
          if (await clearCorruptedCache(err, model))
            return pipeline('feature-extraction', model, { dtype: 'fp32' })
          throw err
        })

      const dimensions = options.dimensions ?? getModelDimensions(model)
      if (!dimensions)
        throw new Error(`Unknown dimensions for model ${model}. Please specify dimensions option.`)

      const embedder: EmbeddingProvider = async (texts) => {
        const results: number[][] = []
        for (const text of texts) {
          const output = await extractor(text, { pooling: 'mean', normalize: true })
          results.push(Array.from(output.data as Float32Array))
        }
        return results
      }

      cached = { embedder, dimensions }
      return cached
    },
  }
}

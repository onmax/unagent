import type { VectorProvider } from '../../../../server/_shared/vector'
import { defineEventHandler, getQuery } from 'h3'
import { validateVectorConfig } from 'unagent/vector'
import { jsonError, nowIso } from '../../../../server/_shared/http'
import { createPlaygroundVector } from '../../../../server/_shared/vector'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as VectorProvider
  const embeddings = (getQuery(event).embeddings as string) || undefined
  const start = Date.now()
  try {
    const preflightEmbeddings = {
      async resolve() {
        return {
          embedder: async (_texts: string[]) => [[0]],
          dimensions: 1,
        }
      },
    }

    const sqlitePreflight = provider === 'sqlite-vec'
      ? validateVectorConfig({
          name: 'sqlite-vec',
          embeddings: preflightEmbeddings,
        })
      : null

    const pineconePreflight = provider === 'pinecone'
      ? validateVectorConfig({
          name: 'pinecone',
          apiKey: process.env.PINECONE_API_KEY,
          host: process.env.PINECONE_HOST,
          index: process.env.PINECONE_INDEX,
          embeddings: preflightEmbeddings,
        })
      : null

    if (provider === 'sqlite-vec' && !sqlitePreflight?.ok) {
      return {
        provider,
        supports: null,
        preflight: sqlitePreflight,
        elapsed: Date.now() - start,
        timestamp: nowIso(),
      }
    }

    if (provider === 'pinecone' && !pineconePreflight?.ok) {
      return {
        provider,
        supports: null,
        preflight: pineconePreflight,
        elapsed: Date.now() - start,
        timestamp: nowIso(),
      }
    }

    const { vector } = await createPlaygroundVector(event, provider, { embeddings })
    return {
      provider,
      supports: vector.supports,
      ...(provider === 'sqlite-vec' ? { preflight: sqlitePreflight } : {}),
      ...(provider === 'pinecone' ? { preflight: pineconePreflight } : {}),
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 400, error instanceof Error ? error.message : String(error), { elapsed: Date.now() - start })
  }
})

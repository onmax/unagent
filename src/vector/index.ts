import type {
  VectorClient,
  VectorDetectionResult,
  VectorOptions,
  VectorProvider,
  VectorProviderOptions,
} from './types'
import type { CloudflareVectorProviderOptions } from './types/cloudflare'
import type { LibsqlProviderOptions } from './types/libsql'
import type { PgvectorProviderOptions } from './types/pgvector'
import type { PineconeProviderOptions } from './types/pinecone'
import type { QdrantProviderOptions } from './types/qdrant'
import type { SqliteVecProviderOptions } from './types/sqlite-vec'
import type { UpstashVectorProviderOptions } from './types/upstash'
import type { WeaviateProviderOptions } from './types/weaviate'
import { provider as envProvider, isWorkerd } from 'std-env'
import { createCloudflareVectorAdapter } from './adapters/cloudflare'
import { createLibsqlAdapter } from './adapters/libsql'
import { createPgvectorAdapter } from './adapters/pgvector'
import { createPineconeAdapter } from './adapters/pinecone'
import { createQdrantAdapter } from './adapters/qdrant'
import { createSqliteVecAdapter } from './adapters/sqlite-vec'
import { UpstashVectorAdapter } from './adapters/upstash'
import { createWeaviateAdapter } from './adapters/weaviate'
import { VectorError } from './errors'
import { validateVectorConfig } from './validation'

export { vectorProviders } from './_providers'
export type { VectorProviderName, VectorProviderOptionsMap } from './_providers'
export { cohere } from './embeddings/cohere'
export type { CohereEmbeddingOptions } from './embeddings/cohere'
export { google } from './embeddings/google'
export type { GoogleEmbeddingOptions } from './embeddings/google'
export { mistral } from './embeddings/mistral'
export type { MistralEmbeddingOptions } from './embeddings/mistral'
export { DEFAULT_MODELS, getModelDimensions, MODEL_DIMENSIONS, resolveModelForPreset } from './embeddings/model-info'
export type { EmbeddingPreset } from './embeddings/model-info'
export { ollama } from './embeddings/ollama'
export type { OllamaEmbeddingOptions } from './embeddings/ollama'
export { openai } from './embeddings/openai'
export type { OpenAIEmbeddingOptions } from './embeddings/openai'
export { resolveEmbedding } from './embeddings/resolve'
export { transformersJs } from './embeddings/transformers-js'
export type { TransformersEmbeddingOptions } from './embeddings/transformers-js'
export { NotSupportedError, VectorError } from './errors'
export { validateVectorConfig }
export type {
  EmbeddingConfig,
  EmbeddingProvider,
  ResolvedEmbedding,
  VectorCapabilities,
  VectorClient,
  VectorConfigValidationIssue,
  VectorConfigValidationResult,
  VectorDetectionResult,
  VectorDocument,
  VectorOptions,
  VectorProvider,
  VectorProviderOptions,
  VectorSearchFilter,
  VectorSearchMeta,
  VectorSearchOptions,
  VectorSearchResult,
} from './types'
export type {
  CloudflareVectorNamespace,
  CloudflareVectorProviderOptions,
  VectorizeIndexBinding,
  VectorizeMatch,
  VectorizeVector,
  VectorizeVectorMetadata,
} from './types/cloudflare'
export type { LibsqlNamespace, LibsqlProviderOptions } from './types/libsql'
export type { PgDistanceMetric, PgvectorNamespace, PgvectorProviderOptions } from './types/pgvector'
export type { PineconeNamespace, PineconeProviderOptions } from './types/pinecone'
export type { QdrantDistance, QdrantNamespace, QdrantProviderOptions } from './types/qdrant'
export type { SqliteVecNamespace, SqliteVecProviderOptions } from './types/sqlite-vec'
export type { UpstashVectorNamespace, UpstashVectorProviderOptions } from './types/upstash'
export type { WeaviateNamespace, WeaviateProviderOptions } from './types/weaviate'

export function detectVector(): VectorDetectionResult {
  if (isWorkerd || envProvider === 'cloudflare_workers')
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (envProvider === 'cloudflare_pages')
    return { type: 'cloudflare', details: { runtime: 'pages' } }

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>

  if (env.CLOUDFLARE_WORKER)
    return { type: 'cloudflare', details: { runtime: 'workers' } }
  if (env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'pages' } }
  if (env.UPSTASH_VECTOR_URL && env.UPSTASH_VECTOR_TOKEN)
    return { type: 'upstash', details: { env: 'upstash' } }
  return { type: 'none' }
}

function canResolve(moduleName: string): boolean {
  try {
    const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
    if (!resolver)
      throw new Error('no-require-resolve')
    resolver(moduleName)
    return true
  }
  catch {
    try {
      const resolver = (import.meta as { resolve?: (id: string) => string }).resolve
      if (typeof resolver !== 'function')
        return false
      resolver(moduleName)
      return true
    }
    catch {
      return false
    }
  }
}

export function isVectorAvailable(provider: VectorProvider): boolean {
  if (provider === 'cloudflare') {
    if (isWorkerd || envProvider === 'cloudflare_workers' || envProvider === 'cloudflare_pages')
      return true
    if (typeof process !== 'undefined') {
      if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
        return true
    }
    return false
  }

  if (provider === 'upstash')
    return canResolve('@upstash/vector')
  if (provider === 'pgvector')
    return canResolve('pg')
  if (provider === 'libsql')
    return canResolve('@libsql/client')
  if (provider === 'sqlite-vec') {
    const nodeSqlite = globalThis.process?.getBuiltinModule?.('node:sqlite') as typeof import('node:sqlite') | undefined
    return !!nodeSqlite && canResolve('sqlite-vec')
  }
  if (provider === 'pinecone')
    return canResolve('@pinecone-database/pinecone')
  if (provider === 'qdrant')
    return canResolve('@qdrant/js-client-rest')
  if (provider === 'weaviate')
    return canResolve('weaviate-client')

  return false
}

function resolveProvider(provider?: VectorProviderOptions): VectorProviderOptions {
  if (provider)
    return provider
  throw new VectorError('Vector provider is required. Pass { provider }.')
}

export function createVector(opts: { provider: CloudflareVectorProviderOptions }): Promise<VectorClient>
export function createVector(opts: { provider: UpstashVectorProviderOptions }): Promise<VectorClient>
export function createVector(opts: { provider: PgvectorProviderOptions }): Promise<VectorClient>
export function createVector(opts: { provider: LibsqlProviderOptions }): Promise<VectorClient>
export function createVector(opts: { provider: SqliteVecProviderOptions }): Promise<VectorClient>
export function createVector(opts: { provider: PineconeProviderOptions }): Promise<VectorClient>
export function createVector(opts: { provider: QdrantProviderOptions }): Promise<VectorClient>
export function createVector(opts: { provider: WeaviateProviderOptions }): Promise<VectorClient>
export function createVector(options?: VectorOptions): Promise<VectorClient>
export async function createVector(options: VectorOptions = {}): Promise<VectorClient> {
  const resolved = resolveProvider(options.provider)

  if (resolved.name === 'cloudflare') {
    const { binding, embeddings } = resolved as CloudflareVectorProviderOptions
    if (!binding)
      throw new VectorError('Cloudflare Vectorize binding is required. Pass { provider: { name: "cloudflare", binding, embeddings } }.')
    if (!embeddings)
      throw new VectorError('Cloudflare Vectorize embeddings config is required. Pass { provider: { name: "cloudflare", embeddings } }.')
    return createCloudflareVectorAdapter(binding, embeddings)
  }

  if (resolved.name === 'upstash') {
    const { url, token, namespace } = resolved as UpstashVectorProviderOptions
    if (!url)
      throw new VectorError('[upstash] url is required')
    if (!token)
      throw new VectorError('[upstash] token is required')
    let IndexCtor: any
    try {
      const mod: any = await import('@upstash/vector')
      IndexCtor = mod.Index || mod.default?.Index || mod.default
    }
    catch (error) {
      throw new VectorError(`@upstash/vector load failed. Install it to use the Upstash provider. Original error: ${error instanceof Error ? error.message : error}`)
    }
    if (!IndexCtor)
      throw new VectorError('Upstash Index constructor not available')
    const index = new IndexCtor({ url, token })
    return new UpstashVectorAdapter(index, namespace)
  }

  if (resolved.name === 'pgvector') {
    const { url, table, embeddings, metric } = resolved as PgvectorProviderOptions
    if (!url)
      throw new VectorError('[pgvector] url is required')
    if (!embeddings)
      throw new VectorError('[pgvector] embeddings is required')
    let PgMod: any
    try {
      PgMod = await import('pg')
    }
    catch (error) {
      throw new VectorError(`pg load failed. Install it to use the pgvector provider. Original error: ${error instanceof Error ? error.message : error}`)
    }
    const PoolCtor = PgMod.Pool || PgMod.default?.Pool || PgMod.default
    if (!PoolCtor)
      throw new VectorError('pg Pool constructor not available')
    const pool = new PoolCtor({ connectionString: url })
    return createPgvectorAdapter(pool, { table, metric, embeddings })
  }

  if (resolved.name === 'libsql') {
    const { url, path, authToken, embeddings } = resolved as LibsqlProviderOptions
    if (!embeddings)
      throw new VectorError('[libsql] embeddings is required')
    let createClient: any
    try {
      const mod: any = await import('@libsql/client')
      createClient = mod.createClient || mod.default?.createClient || mod.default
    }
    catch (error) {
      throw new VectorError(`@libsql/client load failed. Install it to use the libsql provider. Original error: ${error instanceof Error ? error.message : error}`)
    }
    if (!createClient)
      throw new VectorError('libsql createClient is not available')
    const client = createClient({
      url: url || path || 'file:vectors.db',
      ...(authToken && { authToken }),
    })
    return createLibsqlAdapter(client, { embeddings })
  }

  if (resolved.name === 'sqlite-vec') {
    const validation = validateVectorConfig(resolved)
    if (!validation.ok) {
      const firstIssue = validation.issues.find(issue => issue.severity === 'error') || validation.issues[0]
      throw new VectorError(firstIssue?.message || '[sqlite-vec] invalid config')
    }
    const { path, embeddings } = resolved as SqliteVecProviderOptions
    return createSqliteVecAdapter(path, embeddings)
  }

  if (resolved.name === 'pinecone') {
    const validation = validateVectorConfig(resolved)
    if (!validation.ok) {
      const firstIssue = validation.issues.find(issue => issue.severity === 'error') || validation.issues[0]
      throw new VectorError(firstIssue?.message || '[pinecone] invalid config')
    }

    const { apiKey, host, index, namespace, embeddings } = resolved as PineconeProviderOptions
    let PineconeCtor: any
    try {
      const mod: any = await import('@pinecone-database/pinecone')
      PineconeCtor = mod.Pinecone || mod.default?.Pinecone || mod.default
    }
    catch (error) {
      throw new VectorError(`@pinecone-database/pinecone load failed. Install it to use the Pinecone provider. Original error: ${error instanceof Error ? error.message : error}`)
    }
    if (!PineconeCtor)
      throw new VectorError('Pinecone client constructor not available')
    const client = new PineconeCtor({ apiKey: apiKey || process.env.PINECONE_API_KEY })
    let resolvedHost = host
    if (resolvedHost && /^https?:\/\//.test(resolvedHost)) {
      try {
        resolvedHost = new URL(resolvedHost).host
      }
      catch {
        // keep as-is
      }
    }
    const indexClient = client.index({ host: resolvedHost, name: index, ...(namespace ? { namespace } : {}) })
    return createPineconeAdapter(indexClient, { embeddings, namespace })
  }

  if (resolved.name === 'qdrant') {
    const { url, host, port, apiKey, collection, distance, embeddings } = resolved as QdrantProviderOptions
    if (!embeddings)
      throw new VectorError('[qdrant] embeddings is required')
    let QdrantCtor: any
    try {
      const mod: any = await import('@qdrant/js-client-rest')
      QdrantCtor = mod.QdrantClient || mod.default?.QdrantClient || mod.default
    }
    catch (error) {
      throw new VectorError(`@qdrant/js-client-rest load failed. Install it to use the Qdrant provider. Original error: ${error instanceof Error ? error.message : error}`)
    }
    if (!QdrantCtor)
      throw new VectorError('Qdrant client constructor not available')
    const client = new QdrantCtor({ url, host, port, apiKey })
    return createQdrantAdapter(client, { embeddings, collection, distance })
  }

  if (resolved.name === 'weaviate') {
    const { url, host, port, grpcPort, apiKey, collection, embeddings, skipInitChecks } = resolved as WeaviateProviderOptions
    if (!embeddings)
      throw new VectorError('[weaviate] embeddings is required')
    let weaviate: any
    try {
      const mod: any = await import('weaviate-client')
      weaviate = mod.default || mod
    }
    catch (error) {
      throw new VectorError(`weaviate-client load failed. Install it to use the Weaviate provider. Original error: ${error instanceof Error ? error.message : error}`)
    }
    if (!weaviate)
      throw new VectorError('Weaviate client not available')
    const authCredentials = apiKey && weaviate.ApiKey ? new weaviate.ApiKey(apiKey) : undefined
    let client: any
    if (url) {
      let parsed: URL
      try {
        parsed = new URL(url)
      }
      catch {
        throw new VectorError('[weaviate] url must be a valid URL')
      }
      const secure = parsed.protocol === 'https:'
      client = await weaviate.connectToCustom({
        httpHost: parsed.hostname,
        httpPort: parsed.port ? Number(parsed.port) : secure ? 443 : 80,
        httpSecure: secure,
        httpPath: parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : undefined,
        grpcHost: host || parsed.hostname,
        grpcPort: grpcPort || 50051,
        grpcSecure: secure,
        ...(typeof skipInitChecks === 'boolean' ? { skipInitChecks } : {}),
        ...(authCredentials ? { authCredentials } : {}),
      })
    }
    else {
      client = await weaviate.connectToLocal({
        host: host || 'localhost',
        port: port || 8080,
        grpcPort: grpcPort || 50051,
        ...(typeof skipInitChecks === 'boolean' ? { skipInitChecks } : {}),
        ...(authCredentials ? { authCredentials } : {}),
      })
    }
    const vectorizers = weaviate.configure?.vectorizer?.selfProvided?.()
      || weaviate.configure?.vectorizer?.none?.()
    return createWeaviateAdapter(client, { embeddings, collection, vectorizers })
  }

  throw new VectorError(`Unknown vector provider: ${(resolved as { name: string }).name}`)
}

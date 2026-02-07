declare module '@upstash/vector' {
  export class Index {
    constructor(opts: any)
    upsert(vectors: any[], opts?: { namespace?: string }): Promise<void>
    query(params: any, opts?: { namespace?: string }): Promise<any[]>
    delete(ids: string[], opts?: { namespace?: string }): Promise<void>
    reset(opts?: { namespace?: string }): Promise<void>
  }
}

declare module 'pg' {
  export class Pool {
    constructor(opts: any)
    query(sql: string, params?: any[]): Promise<{ rows: any[] }>
    end(): Promise<void>
  }
}

declare module '@libsql/client' {
  export function createClient(opts: any): {
    execute: (input: string | { sql: string, args?: any[] }) => Promise<{ rows?: any[] }>
    close: () => void
  }
}

declare module 'sqlite-vec' {
  export function load(db: any): void
}

declare module '@pinecone-database/pinecone' {
  export class Pinecone {
    constructor(opts?: any)
    index: (opts: any) => any
  }
}

declare module '@qdrant/js-client-rest' {
  export class QdrantClient {
    constructor(opts?: any)
    getCollection: (name: string) => Promise<any>
    createCollection: (name: string, opts: any) => Promise<any>
    upsert: (name: string, opts: any) => Promise<any>
    search: (name: string, opts: any) => Promise<any[]>
    delete: (name: string, opts: any) => Promise<any>
    deleteCollection: (name: string) => Promise<any>
  }
}

declare module 'weaviate-client' {
  export const ApiKey: any
  export function connectToLocal(opts?: any): Promise<any>
  export function connectToCustom(opts?: any): Promise<any>
  export function connectToWeaviateCloud(url: string, opts?: any): Promise<any>
  export const configure: any
  const mod: any
  export default mod
}

declare module 'ai' {
  export function embed(opts: any): Promise<{ embedding: number[] }>
  export function embedMany(opts: any): Promise<{ embeddings: number[][] }>
}

declare module '@ai-sdk/openai' {
  export function createOpenAI(opts: any): any
}

declare module '@ai-sdk/cohere' {
  export function createCohere(opts: any): any
}

declare module '@ai-sdk/google' {
  export function createGoogleGenerativeAI(opts: any): any
}

declare module '@ai-sdk/mistral' {
  export function createMistral(opts: any): any
}

declare module 'ollama-ai-provider-v2' {
  export function createOllama(opts: any): any
}

declare module '@huggingface/transformers' {
  export const env: { cacheDir?: string }
  export function pipeline(task: string, model: string, opts?: any): Promise<any>
}

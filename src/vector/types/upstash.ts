export interface UpstashIndexLike {
  upsert: (vectors: Array<Record<string, any>>, options?: { namespace?: string }) => Promise<void>
  query: (params: Record<string, any>, options?: { namespace?: string }) => Promise<any[]>
  delete: (ids: string[], options?: { namespace?: string }) => Promise<void>
  reset: (options?: { namespace?: string }) => Promise<void>
}

export interface UpstashVectorProviderOptions {
  name: 'upstash'
  url: string
  token: string
  namespace?: string
}

export interface UpstashVectorNamespace {
  index: UpstashIndexLike
  namespace?: string
}

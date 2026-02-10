import type { H3Event } from 'h3'
import { getProvider } from './provider'

export interface ProviderEntry {
  id: string
  label: string
  runtimeOnly?: string
  envRequired?: string[]
  runtimeOrEnv?: string // available natively on this runtime, or via env vars on any runtime
}

export interface ProviderAvailability extends ProviderEntry {
  available: boolean
  reason?: string
}

export const providerRegistry: Record<string, ProviderEntry[]> = {
  sandbox: [
    { id: 'cloudflare', label: 'Cloudflare', runtimeOnly: 'cloudflare' },
    { id: 'vercel', label: 'Vercel', runtimeOrEnv: 'vercel', envRequired: ['VERCEL_TOKEN', 'VERCEL_TEAM_ID', 'VERCEL_PROJECT_ID'] },
    { id: 'deno', label: 'Deno', envRequired: ['DENO_DEPLOY_TOKEN'] },
  ],
  queue: [
    { id: 'cloudflare', label: 'Cloudflare', runtimeOnly: 'cloudflare' },
    { id: 'vercel', label: 'Vercel', runtimeOnly: 'vercel' },
    { id: 'qstash', label: 'QStash', envRequired: ['QSTASH_TOKEN'] },
    { id: 'memory', label: 'Memory' },
  ],
  workflow: [
    { id: 'cloudflare', label: 'Cloudflare', runtimeOnly: 'cloudflare' },
    { id: 'vercel', label: 'Vercel', runtimeOnly: 'vercel' },
    { id: 'openworkflow', label: 'OpenWorkflow', envRequired: ['DATABASE_URL'] },
  ],
  task: [
    { id: 'node', label: 'Node' },
  ],
  vector: [
    { id: 'cloudflare', label: 'Cloudflare', runtimeOnly: 'cloudflare' },
    { id: 'upstash', label: 'Upstash', envRequired: ['UPSTASH_VECTOR_URL', 'UPSTASH_VECTOR_TOKEN'] },
    { id: 'pinecone', label: 'Pinecone', envRequired: ['PINECONE_API_KEY'] },
    { id: 'qdrant', label: 'Qdrant', envRequired: ['QDRANT_URL'] },
    { id: 'weaviate', label: 'Weaviate', envRequired: ['WEAVIATE_URL'] },
    { id: 'pgvector', label: 'pgvector', envRequired: ['DATABASE_URL'] },
    { id: 'libsql', label: 'LibSQL', envRequired: ['LIBSQL_URL'] },
    { id: 'sqlite-vec', label: 'SQLite-vec' },
  ],
}

export function isAvailable(entry: ProviderEntry, runtime: string, _event: H3Event): { available: boolean, reason?: string } {
  if (entry.runtimeOnly && entry.runtimeOnly !== runtime)
    return { available: false, reason: `Requires ${entry.runtimeOnly} runtime` }
  if (entry.runtimeOrEnv && entry.runtimeOrEnv === runtime)
    return { available: true }
  if (entry.envRequired) {
    const missing = entry.envRequired.filter(k => !process.env[k])
    if (missing.length)
      return { available: false, reason: `Missing env: ${missing.join(', ')}` }
  }
  return { available: true }
}

export function getProvidersMatrix(event: H3Event): Record<string, ProviderAvailability[]> {
  const runtime = getProvider(event)
  const result: Record<string, ProviderAvailability[]> = {}
  for (const [feature, entries] of Object.entries(providerRegistry)) {
    result[feature] = entries.map((entry) => {
      const { available, reason } = isAvailable(entry, runtime, event)
      return { ...entry, available, reason }
    })
  }
  return result
}

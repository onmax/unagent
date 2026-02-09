import type { VectorDocument, VectorProvider } from '../../../../server/_shared/vector'
import { defineEventHandler, getQuery } from 'h3'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundVector, DEFAULT_VECTOR_DOCS } from '../../../../server/_shared/vector'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as VectorProvider
  const embeddings = (getQuery(event).embeddings as string) || undefined
  const start = Date.now()
  try {
    const body = await readJsonBody(event)
    const docsInput = Array.isArray((body as any)?.docs)
      ? (body as any).docs
      : Array.isArray(body)
        ? body
        : DEFAULT_VECTOR_DOCS

    const docs: VectorDocument[] = docsInput.map((doc: any, idx: number) => ({
      id: doc?.id ?? `doc-${idx + 1}`,
      content: doc?.content ?? String(doc ?? ''),
      metadata: doc?.metadata,
    }))

    const { vector } = await createPlaygroundVector(event, provider, { embeddings })
    const result = await vector.index(docs)

    return {
      provider,
      count: result.count,
      ids: docs.map(d => d.id),
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    return jsonError(event, 400, error instanceof Error ? error.message : String(error), { elapsed: Date.now() - start })
  }
})

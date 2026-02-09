<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApi } from '../composables/useApi'

const props = defineProps<{ provider: string }>()
const { api, postJson } = useApi()

const embeddings = ref('dummy-hash')
const query = ref('hello world')
const docs = ref(`[
  { "id": "doc-1", "content": "Hello world from Unagent vector demo.", "metadata": { "tag": "demo" } },
  { "id": "doc-2", "content": "Vector search lets you find similar text quickly.", "metadata": { "tag": "demo" } },
  { "id": "doc-3", "content": "Cloudflare Vectorize works great with Workers.", "metadata": { "tag": "cloudflare" } }
]`)
const options = ref('{\n  "limit": 5,\n  "returnContent": true,\n  "returnMetadata": true\n}')
const ids = ref('doc-1,doc-2')

const embeddingsOptions = [
  { label: 'dummy-hash (no API key)', value: 'dummy-hash' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Cohere', value: 'cohere' },
  { label: 'Google', value: 'google' },
  { label: 'Mistral', value: 'mistral' },
  { label: 'Ollama', value: 'ollama' },
  { label: 'Transformers.js', value: 'transformers-js' },
]

function basePath() { return `/api/vector/${props.provider}` }
function safeParseJson(v: string) { if (!v) return {}; return JSON.parse(v) }

const qs = computed(() => {
  return embeddings.value && embeddings.value !== 'dummy-hash'
    ? `?embeddings=${encodeURIComponent(embeddings.value)}` : ''
})

async function index() {
  try {
    await postJson(`${basePath()}/index${qs.value}`, { docs: safeParseJson(docs.value) })
  } catch (err: any) {
    await postJson(`${basePath()}/index${qs.value}`, { docs: [{ id: 'error', content: err?.message || String(err) }] })
  }
}

async function search() {
  try {
    await postJson(`${basePath()}/search${qs.value}`, { query: query.value, options: safeParseJson(options.value) })
  } catch (err: any) {
    await postJson(`${basePath()}/search${qs.value}`, { query: 'error', options: {} })
  }
}

async function remove() {
  const idList = ids.value.split(',').map(s => s.trim()).filter(Boolean)
  await postJson(`${basePath()}/remove${qs.value}`, { ids: idList })
}

async function clear() {
  await postJson(`${basePath()}/clear${qs.value}`, {})
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="grid gap-3">
      <UFormField label="Embeddings">
        <USelect v-model="embeddings" :items="embeddingsOptions" />
      </UFormField>
      <UFormField label="Query">
        <UInput v-model="query" />
      </UFormField>
      <UFormField label="Docs (JSON)">
        <UTextarea v-model="docs" :rows="6" class="font-mono" />
      </UFormField>
    </div>
    <div class="grid gap-3 content-start">
      <UFormField label="Search Options (JSON)">
        <UTextarea v-model="options" :rows="5" class="font-mono" />
      </UFormField>
      <UFormField label="IDs (comma-separated)">
        <UInput v-model="ids" />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" @click="index">index</UButton>
        <UButton size="sm" variant="outline" @click="search">search</UButton>
        <UButton size="sm" variant="outline" @click="remove">remove</UButton>
        <UButton size="sm" variant="outline" color="error" @click="clear">clear</UButton>
        <UButton size="sm" variant="outline" @click="api(`${basePath()}/supports${qs}`)">supports</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

const props = defineProps<{ provider: string }>()
const { api, postJson } = useApi()

const payload = ref('{\n  "userId": "demo"\n}')
const runId = ref('')

function basePath() { return `/api/workflow/${props.provider}` }

function safeParseJson(v: string) {
  if (!v) return {}
  return JSON.parse(v)
}

async function start() {
  try {
    const data = await postJson(`${basePath()}/start`, { payload: safeParseJson(payload.value) })
    if (data?.runId) runId.value = data.runId
  } catch (err: any) {
    await postJson(`${basePath()}/start`, { payload: { error: err?.message || String(err) } })
  }
}

async function status() {
  await api(`${basePath()}/status?runId=${encodeURIComponent(runId.value.trim())}`)
}

async function stop() {
  await postJson(`${basePath()}/stop`, { runId: runId.value.trim() })
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="grid gap-2">
      <UFormField label="Payload (JSON)">
        <UTextarea v-model="payload" :rows="5" class="font-mono" />
      </UFormField>
    </div>
    <div class="grid gap-2">
      <UFormField label="Run ID">
        <UInput v-model="runId" placeholder="runId..." />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" @click="start">start</UButton>
        <UButton size="sm" variant="outline" @click="status">status</UButton>
        <UButton size="sm" variant="outline" color="error" @click="stop">stop</UButton>
      </div>
      <UButton size="sm" variant="outline" @click="api(`${basePath()}/supports`)">supports</UButton>
    </div>
  </div>
</template>

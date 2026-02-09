<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

const props = defineProps<{ provider: string }>()
const { api, postJson } = useApi()

const payload = ref('{\n  "hello": "world"\n}')
const destination = ref('')
const delaySeconds = ref('')
const idempotencyKey = ref('')
const contentType = ref('json')

const contentTypeOptions = [
  { label: 'json', value: 'json' },
  { label: 'text', value: 'text' },
  { label: 'bytes', value: 'bytes' },
  { label: 'v8', value: 'v8' },
]

function basePath() { return `/api/queue/${props.provider}` }
function safeParseJson(v: string) { if (!v) return {}; return JSON.parse(v) }

async function send() {
  try {
    const p = safeParseJson(payload.value)
    const options: Record<string, any> = { contentType: contentType.value }
    if (delaySeconds.value.trim()) options.delaySeconds = Number(delaySeconds.value.trim())
    if (idempotencyKey.value.trim()) options.idempotencyKey = idempotencyKey.value.trim()
    const body: Record<string, any> = { payload: p, options }
    if (props.provider === 'qstash' && destination.value.trim()) body.destination = destination.value.trim()
    await postJson(`${basePath()}/send`, body)
  } catch (err: any) {
    await postJson(`${basePath()}/send`, { payload: { error: err?.message || String(err) } })
  }
}

async function sendBatch() {
  try {
    const p = safeParseJson(payload.value)
    const delay = delaySeconds.value.trim() ? Number(delaySeconds.value.trim()) : 1
    const body: Record<string, any> = { messages: [{ body: p, contentType: contentType.value }], options: { delaySeconds: delay } }
    if (props.provider === 'qstash' && destination.value.trim()) body.destination = destination.value.trim()
    await postJson(`${basePath()}/sendBatch`, body)
  } catch (err: any) {
    await postJson(`${basePath()}/sendBatch`, { messages: [{ body: { error: err?.message || String(err) }, contentType: 'json' }], options: { delaySeconds: 1 } })
  }
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="grid gap-3">
      <UFormField label="Payload (JSON)">
        <UTextarea v-model="payload" :rows="5" class="font-mono" />
      </UFormField>
      <UFormField v-if="provider === 'qstash'" label="Destination URL (QStash)">
        <UInput v-model="destination" placeholder="https://example.com/webhook" />
      </UFormField>
      <UCollapsible>
        <UButton variant="link" size="sm" class="p-0">Options</UButton>
        <template #content>
          <div class="grid grid-cols-3 gap-3 mt-2">
            <UFormField label="delaySeconds">
              <UInput v-model="delaySeconds" placeholder="e.g. 10" />
            </UFormField>
            <UFormField label="idempotencyKey">
              <UInput v-model="idempotencyKey" placeholder="optional" />
            </UFormField>
            <UFormField label="contentType">
              <USelect v-model="contentType" :items="contentTypeOptions" />
            </UFormField>
          </div>
        </template>
      </UCollapsible>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" variant="outline" @click="api(`${basePath()}/supports`)">supports</UButton>
        <UButton size="sm" @click="send">send</UButton>
        <UButton size="sm" variant="outline" @click="sendBatch">sendBatch</UButton>
      </div>
    </div>
    <div class="grid gap-3 content-start">
      <p class="text-xs font-semibold text-(--ui-text-muted)">Memory-only tools</p>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" variant="outline" @click="api(`${basePath()}/peek?limit=20`)">peek</UButton>
        <UButton size="sm" variant="outline" color="error" @click="postJson(`${basePath()}/drain`, { limit: 50 })">drain</UButton>
      </div>
      <p class="text-xs text-(--ui-text-muted)">peek/drain only work with the memory queue provider.</p>
    </div>
  </div>
</template>

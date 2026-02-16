<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

const props = defineProps<{ provider: string }>()
const { api, postJson } = useApi()

const jobName = ref('playground:receipt')
const payload = ref(`{
  "runId": "manual-run",
  "hello": "world"
}`)
const delaySeconds = ref('')
const delayUntil = ref('')
const priority = ref('')
const runId = ref('manual-run')
const eventId = ref('')

function basePath() {
  return `/api/jobs/${props.provider}`
}

function safeParseJson(value: string): Record<string, unknown> {
  if (!value)
    return {}
  return JSON.parse(value)
}

async function enqueue() {
  const parsed = safeParseJson(payload.value)
  const options: Record<string, unknown> = {}
  if (delaySeconds.value.trim())
    options.delaySeconds = Number(delaySeconds.value.trim())
  if (delayUntil.value.trim())
    options.delayUntil = delayUntil.value.trim()
  if (priority.value.trim())
    options.priority = Number(priority.value.trim())

  await postJson(`${basePath()}/enqueue`, {
    name: jobName.value,
    payload: parsed,
    options,
  })
}

async function listReceipts() {
  const q = runId.value.trim()
  await api(`${basePath()}/receipts?runId=${encodeURIComponent(q || 'manual-run')}&limit=20`)
}

async function getReceipt() {
  const q = runId.value.trim()
  const id = eventId.value.trim()
  await api(`${basePath()}/receipts?runId=${encodeURIComponent(q || 'manual-run')}&eventId=${encodeURIComponent(id)}`)
}

async function clearReceipts() {
  await postJson(`${basePath()}/receipts/clear`, {
    runId: runId.value.trim() || 'manual-run',
  })
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="grid gap-3">
      <UFormField label="Job Name">
        <UInput v-model="jobName" placeholder="playground:receipt" class="font-mono" />
      </UFormField>
      <UFormField label="Payload (JSON)">
        <UTextarea v-model="payload" :rows="6" class="font-mono" />
      </UFormField>
      <UCollapsible>
        <UButton variant="link" size="sm" class="p-0">Options</UButton>
        <template #content>
          <div class="grid grid-cols-3 gap-3 mt-2">
            <UFormField label="delaySeconds">
              <UInput v-model="delaySeconds" placeholder="e.g. 5" />
            </UFormField>
            <UFormField label="delayUntil">
              <UInput v-model="delayUntil" placeholder="e.g. 2026-02-16T12:00:00Z" />
            </UFormField>
            <UFormField label="priority">
              <UInput v-model="priority" placeholder="e.g. 1" />
            </UFormField>
          </div>
        </template>
      </UCollapsible>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" variant="outline" @click="api(`${basePath()}/supports`)">supports</UButton>
        <UButton size="sm" @click="enqueue">enqueue</UButton>
      </div>
    </div>

    <div class="grid gap-3 content-start">
      <p class="text-xs font-semibold text-(--ui-text-muted)">Netlify receipts</p>
      <UFormField label="runId">
        <UInput v-model="runId" placeholder="manual-run" class="font-mono" />
      </UFormField>
      <UFormField label="eventId (optional)">
        <UInput v-model="eventId" placeholder="evt_..." class="font-mono" />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" variant="outline" @click="listReceipts">list receipts</UButton>
        <UButton size="sm" variant="outline" @click="getReceipt" :disabled="!eventId.trim()">get receipt</UButton>
        <UButton size="sm" variant="outline" color="error" @click="clearReceipts">clear receipts</UButton>
      </div>
      <p class="text-xs text-(--ui-text-muted)">
        Receipts are only available for the Netlify jobs provider.
      </p>
    </div>
  </div>
</template>

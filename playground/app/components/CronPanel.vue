<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

const props = defineProps<{ provider: string }>()
const { api, postJson } = useApi()

const cronExpr = ref('*/5 * * * *')
const destination = ref('https://example.com/api/task')
const method = ref('POST')
const scheduleId = ref('')

const methodOptions = [
  { label: 'POST', value: 'POST' },
  { label: 'GET', value: 'GET' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
]

function basePath() { return `/api/cron/${props.provider}` }

async function create() {
  const body: Record<string, any> = { cron: cronExpr.value, destination: destination.value, method: method.value }
  if (scheduleId.value.trim()) body.scheduleId = scheduleId.value.trim()
  await postJson(`${basePath()}/create`, body)
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="grid gap-3">
      <UFormField label="Cron Expression">
        <UInput v-model="cronExpr" placeholder="*/5 * * * *" class="font-mono" />
      </UFormField>
      <UFormField label="Destination URL">
        <UInput v-model="destination" placeholder="https://example.com/api/task" />
      </UFormField>
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Method">
          <USelect v-model="method" :items="methodOptions" />
        </UFormField>
        <UFormField label="Schedule ID (QStash upsert)">
          <UInput v-model="scheduleId" placeholder="optional" />
        </UFormField>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" variant="outline" @click="api(`${basePath()}/supports`)">supports</UButton>
        <UButton size="sm" @click="create">create</UButton>
        <UButton size="sm" variant="outline" @click="api(`${basePath()}/list`)">list</UButton>
      </div>
    </div>
    <div class="grid gap-3 content-start">
      <UFormField label="Schedule ID">
        <UInput v-model="scheduleId" placeholder="sched_123 or cron expression" class="font-mono" />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" variant="outline" @click="api(`${basePath()}/get?id=${encodeURIComponent(scheduleId)}`)">get</UButton>
        <UButton size="sm" variant="outline" color="error" @click="postJson(`${basePath()}/delete`, { id: scheduleId })">delete</UButton>
        <UButton size="sm" variant="outline" @click="postJson(`${basePath()}/pause`, { id: scheduleId })">pause</UButton>
        <UButton size="sm" variant="outline" @click="postJson(`${basePath()}/resume`, { id: scheduleId })">resume</UButton>
      </div>
      <p class="text-xs text-(--ui-text-muted)">pause/resume only supported by QStash.</p>
    </div>
  </div>
</template>

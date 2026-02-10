<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

const { api, postJson } = useApi()

const taskName = ref('')
const payloadRaw = ref('{}')

async function runTask() {
  let payload = {}
  try { payload = JSON.parse(payloadRaw.value) }
  catch {}
  await postJson('/api/task/run', { name: taskName.value, payload })
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="grid gap-3">
      <UFormField label="Task Name">
        <UInput v-model="taskName" placeholder="db:cleanup" class="font-mono" />
      </UFormField>
      <UFormField label="Payload (JSON)">
        <UTextarea v-model="payloadRaw" placeholder="{}" class="font-mono" :rows="3" />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" @click="runTask" :disabled="!taskName">
          Run Task
        </UButton>
        <UButton size="sm" variant="outline" @click="api('/api/task/list')">
          List Tasks
        </UButton>
      </div>
    </div>
    <div class="grid gap-3 content-start">
      <p class="text-xs text-(--ui-text-muted)">
        Tasks run in-process. Use <code>startScheduler()</code> for cron-based execution with croner.
      </p>
    </div>
  </div>
</template>

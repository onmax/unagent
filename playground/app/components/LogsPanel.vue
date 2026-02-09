<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useLogs } from '../composables/useLogs'

const { filteredLogs, filterText, autoScroll, clearLogs } = useLogs()
const logListEl = ref<HTMLElement>()

function prettyJson(text: string) {
  try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
}

watch(filteredLogs, async () => {
  if (!autoScroll.value) return
  await nextTick()
  if (logListEl.value) logListEl.value.scrollTop = 0
}, { deep: true })
</script>

<template>
  <div class="border-t border-(--ui-border)">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-(--ui-border)">
      <UInput v-model="filterText" placeholder="filter logs..." size="sm" class="min-w-[180px] flex-1" icon="i-lucide-search" />
      <UButton size="sm" variant="ghost" color="neutral" @click="autoScroll = !autoScroll">
        autoscroll: {{ autoScroll ? 'on' : 'off' }}
      </UButton>
      <UButton size="sm" variant="ghost" color="error" @click="clearLogs()">clear</UButton>
    </div>

    <div ref="logListEl" class="divide-y divide-(--ui-border)">
      <div v-if="!filteredLogs.length" class="p-4 text-center text-sm text-(--ui-text-muted)">
        No logs yet.
      </div>
      <div v-for="(log, i) in filteredLogs" :key="i" class="p-3 font-mono text-xs whitespace-pre-wrap break-words">
        <div class="flex gap-2 flex-wrap items-center mb-2 font-sans text-(--ui-text-muted)">
          <UBadge :color="log.status === 'success' ? 'success' : 'error'" variant="subtle" size="sm">
            {{ log.status === 'success' ? 'ok' : 'error' }}
          </UBadge>
          <UBadge variant="outline" size="sm">{{ log.endpoint }}</UBadge>
          <UBadge v-if="log.elapsed != null" color="warning" variant="subtle" size="sm">{{ log.elapsed }}ms</UBadge>
          <span class="text-[10px]">{{ log.time }}</span>
        </div>
        <div class="text-(--ui-text)">{{ prettyJson(log.responseText || '(no response)') }}</div>
      </div>
    </div>
  </div>
</template>

import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'

export interface LogEntry {
  time: string
  status: 'success' | 'error'
  endpoint: string
  elapsed?: number
  responseText: string
}

export const useLogs = createSharedComposable(() => {
  const logs = ref<LogEntry[]>([])
  const filterText = ref('')
  const autoScroll = ref(true)

  const filteredLogs = computed(() => {
    const q = filterText.value.trim().toLowerCase()
    if (!q)
      return logs.value
    return logs.value.filter(l =>
      l.endpoint.toLowerCase().includes(q)
      || l.responseText.toLowerCase().includes(q)
      || l.status.includes(q),
    )
  })

  function addLog(entry: Omit<LogEntry, 'time'>): void {
    logs.value.unshift({ ...entry, time: new Date().toLocaleTimeString() })
  }

  function clearLogs(): void {
    logs.value = []
  }

  return { logs, filterText, autoScroll, filteredLogs, addLog, clearLogs }
})

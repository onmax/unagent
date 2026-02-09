import { createSharedComposable } from '@vueuse/core'
import { ref } from 'vue'
import { useApi } from './useApi'

export interface ProviderEntry {
  id: string
  label: string
  available: boolean
  reason?: string
}

export const FEATURES: Record<string, { title: string, subtitle: string }> = {
  sandbox: { title: 'Sandbox', subtitle: 'Quick calls for sandbox capabilities and actions.' },
  workflow: { title: 'Workflow', subtitle: 'Start a workflow, check status, stop it.' },
  queue: { title: 'Queue', subtitle: 'Send and batch messages.' },
  vector: { title: 'Vector', subtitle: 'Index/search/remove/clear documents.' },
  cron: { title: 'Cron', subtitle: 'Create, list, pause, resume schedules.' },
}

export const useProviders = createSharedComposable(() => {
  const providersData = ref<Record<string, ProviderEntry[]>>({})
  const runtime = ref('')
  const loaded = ref(false)

  const { api } = useApi()

  async function load(): Promise<void> {
    const health = await api('/api/health')
    runtime.value = health?.provider || 'unknown'

    const reg = await api('/api/providers')
    if (reg?.providers)
      providersData.value = reg.providers
    loaded.value = true
  }

  function isAvailable(feature: string, provider: string): boolean {
    const entry = (providersData.value[feature] || []).find(p => p.id === provider)
    return entry?.available ?? false
  }

  function firstAvailable(): { feature: string, provider: string } | null {
    for (const [feature, entries] of Object.entries(providersData.value)) {
      const avail = entries.find(e => e.available)
      if (avail)
        return { feature, provider: avail.id }
    }
    return null
  }

  return { providersData, runtime, loaded, load, isAvailable, firstAvailable }
})

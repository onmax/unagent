<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProviders } from '../composables/useProviders'
import SandboxPanel from './SandboxPanel.vue'
import WorkflowPanel from './WorkflowPanel.vue'
import QueuePanel from './QueuePanel.vue'
import VectorPanel from './VectorPanel.vue'
import CronPanel from './CronPanel.vue'

const route = useRoute()
const { isAvailable, providersData } = useProviders()

const feature = computed(() => route.params.feature as string)
const provider = computed(() => route.params.provider as string)
const available = computed(() => isAvailable(feature.value, provider.value))

const reason = computed(() => {
  const entry = (providersData.value[feature.value] || []).find(p => p.id === provider.value)
  return entry?.reason || 'Provider is not configured for this runtime.'
})

// Persist selection
watch([feature, provider], ([f, p]) => {
  if (f && p) localStorage.setItem('unagent.playground.sel', `${f}/${p}`)
}, { immediate: true })
</script>

<template>
  <div>
    <UEmpty v-if="!available" icon="i-lucide-circle-x" title="Not available" :description="reason" />

    <SandboxPanel v-else-if="feature === 'sandbox'" :provider="provider" />
    <WorkflowPanel v-else-if="feature === 'workflow'" :provider="provider" />
    <QueuePanel v-else-if="feature === 'queue'" :provider="provider" />
    <VectorPanel v-else-if="feature === 'vector'" :provider="provider" />
    <CronPanel v-else-if="feature === 'cron'" :provider="provider" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProviders, FEATURES } from './composables/useProviders'
import { useApi } from './composables/useApi'
import LogsPanel from './components/LogsPanel.vue'

const { load, loaded, firstAvailable, providersData, runtime } = useProviders()
const { api } = useApi()
const router = useRouter()
const route = useRoute()

const featureIcons: Record<string, string> = {
  sandbox: 'i-lucide-box',
  workflow: 'i-lucide-git-branch',
  queue: 'i-lucide-mail',
  vector: 'i-lucide-search',
}

const sidebarLinks = computed(() => {
  return Object.entries(providersData.value).map(([feature, entries]) => ({
    label: FEATURES[feature]?.title,
    icon: featureIcons[feature],
    type: 'trigger' as const,
    defaultOpen: true,
    children: entries.map(e => ({
      label: e.label,
      to: `/${feature}/${e.id}`,
      ...(!e.available && { badge: { label: 'n/a', color: 'neutral' as const, variant: 'subtle' as const } }),
    })),
  }))
})

const currentFeature = computed(() => route.params.feature as string)

const navbarTitle = computed(() => FEATURES[currentFeature.value]?.title || 'Unagent Playground')

const providerTabs = computed(() => {
  const entries = providersData.value[currentFeature.value] || []
  return entries.map(e => ({
    label: e.label,
    to: `/${currentFeature.value}/${e.id}`,
    ...(!e.available && { badge: { label: 'n/a', color: 'neutral' as const, variant: 'subtle' as const } }),
  }))
})

onMounted(async () => {
  await load()
  const saved = localStorage.getItem('unagent.playground.sel')
  if (saved) {
    const [f, p] = saved.split('/')
    if (f && p) { router.replace(`/${f}/${p}`); return }
  }
  const first = firstAvailable()
  if (first) router.replace(`/${first.feature}/${first.provider}`)
})
</script>

<template>
  <UApp>
    <UDashboardGroup unit="rem">
      <UDashboardSidebar
        id="default"
        collapsible
        resizable
        class="bg-elevated/25"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >
        <template #header="{ collapsed }">
          <div class="flex items-center gap-2" :class="collapsed ? 'justify-center' : ''">
            <UIcon name="i-lucide-terminal" class="size-5 shrink-0" />
            <span v-if="!collapsed" class="font-semibold text-sm truncate">Unagent</span>
          </div>
        </template>

        <template #default="{ collapsed }">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="sidebarLinks"
            orientation="vertical"
            highlight
            color="neutral"
            tooltip
            popover
          />
        </template>

        <template #footer="{ collapsed }">
          <div :class="collapsed ? 'flex flex-col items-center gap-1' : 'flex flex-col gap-1 px-1'">
            <UBadge v-if="!collapsed" :color="runtime ? 'success' : 'warning'" variant="subtle" size="sm" class="mb-1">
              runtime: {{ runtime || '...' }}
            </UBadge>
            <UButton :icon="collapsed ? 'i-lucide-heart-pulse' : undefined" size="xs" variant="ghost" color="neutral" @click="api('/api/health')">
              <span v-if="!collapsed">/api/health</span>
            </UButton>
            <UButton :icon="collapsed ? 'i-lucide-key-round' : undefined" size="xs" variant="ghost" color="neutral" @click="api('/api/oidc')">
              <span v-if="!collapsed">/api/oidc</span>
            </UButton>
          </div>
        </template>
      </UDashboardSidebar>

      <UDashboardPanel id="main">
        <template #header>
          <UDashboardNavbar :title="navbarTitle">
            <template #leading>
              <UDashboardSidebarCollapse />
            </template>
          </UDashboardNavbar>

          <UDashboardToolbar v-if="providerTabs.length">
            <UNavigationMenu :items="providerTabs" highlight class="-mx-1 flex-1" />
          </UDashboardToolbar>
        </template>

        <template #body>
          <template v-if="loaded">
            <RouterView />
          </template>
          <p v-else class="text-(--ui-text-muted) p-4">Loading providers...</p>

          <LogsPanel class="mt-4" />
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>

<script setup lang="ts">
import { useApi } from '../composables/useApi'

const props = defineProps<{ provider: string }>()
const { api } = useApi()

const actions = ['', 'supports', 'session', 'mkdir', 'files', 'stream', 'process', 'git', 'code', 'ports']

function call(action: string) {
  const base = `/api/sandbox/${props.provider}`
  api(action ? `${base}/${action}` : base)
}
</script>

<template>
  <div class="grid gap-3">
    <UFieldGroup>
      <UButton
        v-for="a in actions" :key="a"
        size="sm"
        :variant="a === '' ? 'soft' : 'outline'"
        :color="a === '' ? 'primary' : 'neutral'"
        @click="call(a)"
      >
        {{ a || 'sandbox' }}
      </UButton>
    </UFieldGroup>
    <p class="text-xs text-(--ui-text-muted)">Same endpoints behave differently depending on provider.</p>
  </div>
</template>

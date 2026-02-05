import type { VectorProviderName } from '../../../_providers'
import { defineNuxtPlugin } from '#imports'
import { useVector } from '../composables/useVector.server'

const vectorNuxtPlugin: ReturnType<typeof defineNuxtPlugin> = defineNuxtPlugin(() => {
  return {
    provide: {
      vector: (providerName?: VectorProviderName) => useVector(providerName),
    },
  }
})

export default vectorNuxtPlugin

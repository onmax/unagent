<script setup lang="ts">
import { useApi } from '../composables/useApi'

const props = defineProps<{ provider: string }>()
const { api, postJson } = useApi()

function basePath() {
  return `/api/browser/${props.provider}`
}

function callSupports() {
  api(`${basePath()}/supports`)
}

function callSmoke() {
  api(`${basePath()}/smoke`)
}

function callScreenshot() {
  api(`${basePath()}/screenshot`)
}

function callExtractText() {
  postJson(`${basePath()}/extract`, {
    kind: 'text',
    selector: '#copy',
  })
}

function callExtractHtml() {
  postJson(`${basePath()}/extract`, {
    kind: 'html',
    selector: 'main',
  })
}

function callExtractJson() {
  postJson(`${basePath()}/extract`, {
    kind: 'json',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['title', 'text'],
      additionalProperties: false,
    },
  })
}
</script>

<template>
  <div class="grid gap-3">
    <UFieldGroup>
      <UButton size="sm" color="primary" variant="soft" @click="callSupports">supports</UButton>
      <UButton size="sm" color="neutral" variant="outline" @click="callSmoke">smoke</UButton>
      <UButton size="sm" color="neutral" variant="outline" @click="callScreenshot">screenshot</UButton>
      <UButton size="sm" color="neutral" variant="outline" @click="callExtractText">extract:text</UButton>
      <UButton size="sm" color="neutral" variant="outline" @click="callExtractHtml">extract:html</UButton>
      <UButton size="sm" color="neutral" variant="outline" @click="callExtractJson">extract:json</UButton>
    </UFieldGroup>

    <p class="text-xs text-(--ui-text-muted)">Smoke uses a data URL page and runs deterministic extraction with optional JSON schema validation.</p>
  </div>
</template>

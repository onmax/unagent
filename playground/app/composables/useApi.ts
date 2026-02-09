import { createSharedComposable } from '@vueuse/core'
import { ref } from 'vue'
import { useLogs } from './useLogs'

export const useApi = createSharedComposable(() => {
  const lastResponseText = ref('')
  const { addLog } = useLogs()

  function tryJson(text: string): any {
    try {
      return JSON.parse(text)
    }
    catch { return text }
  }

  async function api(endpoint: string, init?: RequestInit): Promise<any> {
    const start = Date.now()
    try {
      const res = await fetch(endpoint, init)
      const text = await res.text()
      lastResponseText.value = text

      let status: 'success' | 'error' = res.ok ? 'success' : 'error'
      try {
        if (JSON.parse(text)?.error)
          status = 'error'
      }
      catch {}

      addLog({ status, endpoint, elapsed: Date.now() - start, responseText: text })
      return tryJson(text)
    }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog({ status: 'error', endpoint, elapsed: Date.now() - start, responseText: msg })
      return null
    }
  }

  async function postJson(endpoint: string, body: unknown): Promise<any> {
    return api(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function copyLast(): Promise<void> {
    if (!lastResponseText.value)
      return
    try {
      await navigator.clipboard.writeText(lastResponseText.value)
    }
    catch {}
  }

  return { lastResponseText, api, postJson, copyLast }
})

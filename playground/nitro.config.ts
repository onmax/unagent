import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // Keep a flat layout in `playground/` (no `server/` prefix).
  srcDir: '.',
  scanDirs: ['routes'],
  plugins: ['~/server/plugins/vercel-request-context'],

  compatibilityDate: '2026-02-05',

  rollupConfig: {
    external: ['pg-native'],
  },

  cloudflare: {
    nodeCompat: true,
  },

  vercel: {
    config: {
      functions: {
        __fallback: {
          experimentalTriggers: [
            {
              type: 'queue/v1beta',
              topic: 'unagent-playground',
              consumer: 'playground',
            },
          ],
        },
      },
    },
  },
})

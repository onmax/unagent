import ui from '@nuxt/ui/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    ui({
      ui: { colors: { primary: 'emerald', neutral: 'slate' } },
    }),
  ],
  server: {
    port: 3001,
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: { outDir: '../public', emptyOutDir: true },
})

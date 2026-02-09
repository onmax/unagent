import ui from '@nuxt/ui/vue-plugin'
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/sandbox/cloudflare' },
    { path: '/:feature/:provider', component: () => import('./components/FeaturePanel.vue') },
  ],
})

const app = createApp(App)
app.use(router)
app.use(ui)
app.mount('#app')

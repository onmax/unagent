export default defineNuxtPlugin(() => {
  useHead({
    script: [
      {
        'type': 'module',
        'src': 'https://console.vitehub.dev/hosted-comments.js',
        'data-vitehub-comments': 'a581b001-c747-4b03-9a3d-0f1b270702bd',
        'data-vitehub-repo': 'onmax/unagent',
      },
    ],
  })
})

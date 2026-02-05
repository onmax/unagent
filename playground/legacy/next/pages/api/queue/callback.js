import { handleCallback } from '@vercel/queue/nextjs/pages'

const TOPIC = 'unagent-playground'
const CONSUMER = 'playground'

export const config = { runtime: 'nodejs' }

export default handleCallback({
  [TOPIC]: {
    [CONSUMER]: async (message, metadata) => {
      console.log('[queue callback]', { message, metadata })
    },
  },
})


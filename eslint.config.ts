import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  pnpm: true,
  ignores: [
    'playground/.nitro/**',
    'playground/.output/**',
    'playground/.vercel/**',
    'playground/.wrangler/**',
    'playground/nuxt/**',
    'playground/server/plugins/**',
  ],
  rules: {
    'node/prefer-global/process': 'off',
    'no-control-regex': 'off',
    'regexp/no-super-linear-backtracking': 'off',
    'regexp/no-misleading-capturing-group': 'off',
    'regexp/no-unused-capturing-group': 'off',
  },
})

import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  pnpm: true,
  rules: {
    'node/prefer-global/process': 'off',
    'no-control-regex': 'off',
    'regexp/no-super-linear-backtracking': 'off',
    'regexp/no-misleading-capturing-group': 'off',
    'regexp/no-unused-capturing-group': 'off',
  },
})

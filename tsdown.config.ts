import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/env/index.ts',
    'src/skill/index.ts',
    'src/link/index.ts',
    'src/lock/index.ts',
    'src/source/index.ts',
    'src/git/index.ts',
    'src/utils/index.ts',
  ],
  format: 'esm',
  dts: true,
  clean: true,
})

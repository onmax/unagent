import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/context/index.ts',
    'src/env/index.ts',
    'src/exec/index.ts',
    'src/fs/index.ts',
    'src/git/index.ts',
    'src/hooks/index.ts',
    'src/link/index.ts',
    'src/lock/index.ts',
    'src/registry/index.ts',
    'src/sandbox/index.ts',
    'src/skill/index.ts',
    'src/source/index.ts',
    'src/stop/index.ts',
    'src/stream/index.ts',
    'src/tool/index.ts',
    'src/usage/index.ts',
    'src/utils/index.ts',
  ],
  format: 'esm',
  fixedExtension: true,
  dts: true,
  clean: true,
})

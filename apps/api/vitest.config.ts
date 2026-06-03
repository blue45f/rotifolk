import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Resolve the same path aliases the api's tsconfig declares so service-level
// unit tests can import modules that use `@/` and `@rotifolk/shared`.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@rotifolk/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})

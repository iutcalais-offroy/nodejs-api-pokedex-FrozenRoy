import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/generated/**',
        'prisma/**',
        '*.config.ts',
        'src/env.ts',
        'src/index.ts',
        'src/docs/**',
        'tests/**',
        'src/sockets/**',
        'src/models/**',
        'src/utils/**',
        'src/types/**',
      ],
      thresholds: {
        branches: 75,
        functions: 100,
        lines: 85,
        statements: 85,
      },
    },
  },
})

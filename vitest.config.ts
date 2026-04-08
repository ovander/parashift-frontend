import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Separate config for Vitest — keeps vitest/config's bundled Vite types isolated
// from the main vite.config.ts which uses Vite 8 (rolldown-based).
export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [vue() as any],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Exclude e2e/ — those are Playwright tests, not Vitest
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/stores/**',
        'src/composables/**',
        'src/features/**/stores/**',
        'src/features/**/composables/**',
      ],
      thresholds: { statements: 80 },
    },
  },
})

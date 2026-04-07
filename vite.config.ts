import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5181,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/vue-router/') || id.includes('/node_modules/vue/') || id.includes('/pinia/'))
            return 'vendor-vue'
          if (id.includes('/primevue/') || id.includes('/@primevue/'))
            return 'vendor-primevue'
          if (id.includes('/@fullcalendar/'))
            return 'vendor-fullcal'
          if (id.includes('/axios/') || id.includes('/vue-i18n/') || id.includes('/@vueuse/'))
            return 'vendor-utils'
        },
      },
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
      include: ['src/stores/**', 'src/composables/**', 'src/features/**/stores/**', 'src/features/**/composables/**'],
      thresholds: { statements: 80 },
    },
  },
})

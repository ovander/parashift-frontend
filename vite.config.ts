import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { execSync } from 'child_process'

function gitCommit(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return 'unknown' }
}

export default defineConfig({
  define: {
    __APP_VERSION__:    JSON.stringify(process.env.npm_package_version ?? 'dev'),
    __APP_COMMIT__:     JSON.stringify(process.env.VITE_COMMIT ?? gitCommit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
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
})

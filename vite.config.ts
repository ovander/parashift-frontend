import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { execSync } from 'child_process'

function gitVersion(): string {
  try { return execSync('git describe --tags --always --dirty').toString().trim() }
  catch { return 'dev' }
}

function gitCommit(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return 'unknown' }
}

// The SPA talks to its own origin only: the backend's BFF holds the tokens and
// the browser sends its session cookie to this host, so the build pins
// connect-src to 'self' (plus the Sentry ingest origin when VITE_SENTRY_DSN is
// set). Sign-in at Socrate is a navigation, not a request.
export function contentSecurityPolicy(env: Record<string, string>): string {
  const connect = ["'self'"]
  if (env.VITE_SENTRY_DSN) {
    try {
      connect.push(new URL(env.VITE_SENTRY_DSN).origin)
    } catch {
      throw new Error(`VITE_SENTRY_DSN is not a URL: "${env.VITE_SENTRY_DSN}"`)
    }
  }
  return `connect-src ${connect.join(' ')}; object-src 'none'; base-uri 'self'`
}

function cspMeta(): Plugin {
  let policy = ''
  return {
    name: 'csp-meta',
    apply: 'build',
    configResolved(config) {
      policy = contentSecurityPolicy(config.env)
    },
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }]
    },
  }
}

// In development the SPA and the API are on different ports; the dev server
// proxies the API's paths so the SPA still calls its own origin and the
// session cookie works. PARASHIFT_API overrides the API address.
const backend  = process.env.PARASHIFT_API || 'http://localhost:8080'
const devProxy = Object.fromEntries(['/api', '/bff', '/auth'].map(p => [p, { target: backend }]))

export default defineConfig({
  define: {
    __APP_VERSION__:    JSON.stringify(gitVersion()),
    __APP_COMMIT__:     JSON.stringify(gitCommit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [vue(), cspMeta()],
  server: {
    port: 5181,
    strictPort: true,
    proxy: devProxy,
  },
  // vite preview serves the build alone: the end-to-end tests mock every
  // backend path with page.route().
  preview: { proxy: {} },
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

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './plugins/i18n'
import { setupPrimeVue } from './plugins/primevue'
import { devlog } from './utils/logger'
import { useAppVersion } from './composables/useAppVersion'
import './style.css'

// ── Startup banner (dev + prod) ───────────────────────────────────────────────
console.info(
  '%c🏪 ParaShift %cv' + __APP_VERSION__ + ' · ' + __APP_COMMIT__ + '%c · built ' + __APP_BUILD_TIME__,
  'font-weight:bold;color:#6366f1;font-size:14px',
  'background:#e0e7ff;color:#4338ca;padding:2px 6px;border-radius:4px;font-size:12px',
  'color:#9ca3af;font-size:11px',
)

if (import.meta.env.DEV) {
  console.info('[parashift] devlog active — open DevTools Console to see flow logs')
  devlog.debug('startup env', {
    API: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    MODE: import.meta.env.MODE,
  })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
setupPrimeVue(app)

app.mount('#app')
devlog.info('app mounted')

// Pre-fetch backend version so it's ready by the time the user opens the About dialog.
useAppVersion().fetchBackend()

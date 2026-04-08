import { ref, reactive, readonly } from 'vue'
import api from '@/composables/useApi'

export interface BackendVersion {
  version:    string
  commit:     string
  build_time: string
}

// Module-level singletons — fetched once at startup, shared across all callers.
const _backend = ref<BackendVersion | null>(null)
const _loading  = ref(false)
const _error    = ref<string | null>(null)

async function fetchBackend() {
  if (_backend.value || _loading.value) return
  _loading.value = true
  try {
    const { data } = await api.get<BackendVersion>('/api/version')
    _backend.value = data
  } catch (e: any) {
    _error.value = e?.message ?? 'unknown error'
  } finally {
    _loading.value = false
  }
}

// Returned as reactive so nested refs auto-unwrap in templates.
// i.e. appVersion.backend.version works, not appVersion.backend.value.version
export function useAppVersion() {
  return reactive({
    backend:  _backend,   // null until fetchBackend() resolves
    loading:  readonly(_loading),
    error:    readonly(_error),
    fetchBackend,

    // Baked in at build time via vite.config.ts define
    frontend: {
      version:   __APP_VERSION__,
      commit:    __APP_COMMIT__,
      buildTime: __APP_BUILD_TIME__,
    },
  })
}

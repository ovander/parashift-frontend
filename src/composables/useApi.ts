import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { devlog } from '@/utils/logger'

// ── Same-origin API client ────────────────────────────────────────────────────
// The backend's BFF keeps the OAuth tokens; the browser sends its HttpOnly
// session cookie, which it does for same-origin requests only. Every call is
// therefore a relative path on the SPA's own origin (Caddy routes /api, /bff
// and /auth to the backend), and never carries an Authorization header.
// withCredentials stays false: no cookie would ever go to another origin.

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

/** True for a URL that names an origin (scheme or protocol-relative). */
export function isAbsoluteUrl(url: string | undefined): boolean {
  return !!url && (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//'))
}

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean }

// ── Request interceptor: same-origin only, CSRF on unsafe methods ─────────────
function addSessionInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (isAbsoluteUrl(config.baseURL) || isAbsoluteUrl(config.url)) {
      throw new Error(`[api] refusing a cross-origin request to ${config.url}`)
    }
    config.headers.delete('Authorization')
    if (UNSAFE_METHODS.has((config.method ?? 'get').toLowerCase())) {
      const csrf = useAuthStore().csrf
      if (csrf) config.headers.set('X-CSRF-Token', csrf)
    }
    return config
  })
}

/** After the session is lost: a fresh sign-in, back to this page. */
function signInAgain() {
  const here = window.location.pathname + window.location.search + window.location.hash
  useAuthStore().login(here)
}

// ── Response interceptor: session loss, stale CSRF token, error logging ───────
function addResponseInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (r) => r,
    async (error) => {
      const config = error.config as RetriableConfig | undefined
      const status = error.response?.status

      if (status !== 401) {
        const method = (config?.method ?? '?').toUpperCase()
        const url    = config?.url ?? '?'
        devlog.error(`[api] ${method} ${url} → ${status ?? 'no-response'}`, error.response?.data ?? error.message)
      }

      const auth = useAuthStore()

      // A 401 means the session is gone (idle timeout, signed out elsewhere, or
      // its refresh token rejected). Ask the backend once; without a session,
      // sign in again and come back here.
      if (status === 401) {
        devlog.debug('[api] 401 — re-checking the session')
        if (!(await auth.recheckSession())) signInAgain()
        return Promise.reject(error)
      }

      // A 403 for the CSRF token means this tab holds a stale one (a sign-in
      // in another tab replaced the session): fetch the current one, retry once.
      const message = String(error.response?.data?.message ?? error.response?.data?.error?.message ?? '')
      if (status === 403 && /csrf/i.test(message) && config && !config._csrfRetried) {
        config._csrfRetried = true
        if (await auth.recheckSession()) return instance(config)
        signInAgain()
      }
      return Promise.reject(error)
    },
  )
}

function createTimedApi(timeoutMs: number): AxiosInstance {
  const instance = axios.create({
    baseURL: '',
    timeout: timeoutMs,
    withCredentials: false,
    headers: { 'Content-Type': 'application/json' },
  })
  addSessionInterceptor(instance)
  addResponseInterceptor(instance)
  return instance
}

// ── Base API instance (5s default timeout) ────────────────────────────────────
const api: AxiosInstance = createTimedApi(5_000)

/** 10s — scheduling mutations (assign/unassign) — fail fast on drag-drop */
export function useScheduleApi(): AxiosInstance { return createTimedApi(10_000) }

/** 30s — heavy report/analytics endpoints */
export function useReportApi(): AxiosInstance { return createTimedApi(30_000) }

/** 120s — LLM inference endpoints */
export function useAIApi(): AxiosInstance { return createTimedApi(120_000) }

export function useApi() { return api }
export default api

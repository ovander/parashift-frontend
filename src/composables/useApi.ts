import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { devlog } from '@/utils/logger'

// ── Base API instance (5s default timeout) ────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 5_000,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

function addAuthInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const auth = useAuthStore()
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }
    return config
  })
}

function addResponseInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (r) => r,
    async (error) => {
      const originalRequest = error.config
      if (error.response?.status !== 401) {
        const method = (error.config?.method ?? '?').toUpperCase()
        const url    = error.config?.url ?? '?'
        const status = error.response?.status ?? 'no-response'
        devlog.error(`[api] ${method} ${url} → ${status}`, error.response?.data ?? error.message)
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return instance(originalRequest)
          })
        }
        originalRequest._retry = true
        isRefreshing = true
        try {
          devlog.debug('[api] token expired — attempting silent refresh')
          const auth = useAuthStore()
          await auth.refresh()
          processQueue(null, auth.accessToken)
          originalRequest.headers.Authorization = `Bearer ${auth.accessToken}`
          return instance(originalRequest)
        } catch (refreshError) {
          devlog.error('[api] refresh failed — logging out', refreshError)
          processQueue(refreshError, null)
          useAuthStore().logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }
      return Promise.reject(error)
    },
  )
}

addAuthInterceptor(api)
addResponseInterceptor(api)

function createTimedApi(timeoutMs: number): AxiosInstance {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  })
  addAuthInterceptor(instance)
  addResponseInterceptor(instance)
  return instance
}

/** 10s — scheduling mutations (assign/unassign) — fail fast on drag-drop */
export function useScheduleApi(): AxiosInstance { return createTimedApi(10_000) }

/** 30s — heavy report/analytics endpoints */
export function useReportApi(): AxiosInstance { return createTimedApi(30_000) }

/** 120s — LLM inference endpoints */
export function useAIApi(): AxiosInstance { return createTimedApi(120_000) }

export function useApi() { return api }
export default api

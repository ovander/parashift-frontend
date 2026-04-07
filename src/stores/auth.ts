import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { createDevlog } from '@/utils/logger'

const log = createDevlog('AuthStore')

// ── Token persistence ─────────────────────────────────────────────────────────
// Tokens are stored in localStorage so they survive page reloads.
// NEVER store tokens in sessionStorage (lost on tab close) or in-memory only.
// The access token is short-lived; the refresh token is the long-lived credential
// and is what actually needs to survive across sessions.
const LS_ACCESS  = 'auth.accessToken'
const LS_REFRESH = 'auth.refreshToken'
const LS_USER    = 'auth.user'

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // Storage quota exceeded or private mode — best-effort, not fatal.
  }
}

function lsClear(): void {
  lsSet(LS_ACCESS,  null)
  lsSet(LS_REFRESH, null)
  lsSet(LS_USER,    null)
}

export interface AuthUser {
  id:        string
  name:      string
  position:  'admin' | 'manager' | 'employee'
  job_role?: string   // pharmacist | animator | ... — shift eligibility
  store_id?: string   // present for manager/employee, absent for admin
}

interface AuthTokens {
  accessToken:  string
  refreshToken: string
}

export const useAuthStore = defineStore('auth', () => {
  // E2E testing hook: Playwright injects window.__E2E_AUTH__ via addInitScript.
  // E2E values take priority over persisted state so tests always start clean.
  const _e2e = typeof window !== 'undefined' ? (window as any).__E2E_AUTH__ : undefined

  // Seed from localStorage so tokens survive page reloads.
  const user         = ref<AuthUser | null>(_e2e?.user         ?? lsGet<AuthUser>(LS_USER))
  const accessToken  = ref<string | null>  (_e2e?.accessToken  ?? lsGet<string>(LS_ACCESS))
  const refreshToken = ref<string | null>  (_e2e?.refreshToken ?? lsGet<string>(LS_REFRESH))

  // Keep localStorage in sync whenever state changes.
  watch(accessToken,  v => lsSet(LS_ACCESS,  v))
  watch(refreshToken, v => lsSet(LS_REFRESH, v))
  watch(user,         v => lsSet(LS_USER,    v), { deep: true })

  const isAuthenticated = computed(() => !!accessToken.value)

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

  async function callback(code: string, codeVerifier: string) {
    log.info('callback →', { redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI })
    try {
      const res = await axios.post<AuthTokens>(`${apiBase}/auth/callback`, {
        code, codeVerifier, redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI,
      })
      accessToken.value  = res.data.accessToken
      refreshToken.value = res.data.refreshToken
      log.info('callback ← tokens received, fetching user profile')
      await fetchMe()
      log.info('callback ← done', { userId: user.value?.id, position: user.value?.position })
    } catch (err) {
      log.error('callback failed', err)
      throw err
    }
  }

  async function refresh() {
    if (!refreshToken.value) {
      log.warn('refresh called with no refresh token')
      throw new Error('No refresh token')
    }
    log.debug('refresh → requesting new tokens')
    try {
      const res = await axios.post<{ tokens: AuthTokens }>(`${apiBase}/auth/refresh`, {
        refreshToken: refreshToken.value,
      })
      accessToken.value  = res.data.tokens.accessToken
      refreshToken.value = res.data.tokens.refreshToken
      log.debug('refresh ← tokens rotated')
    } catch (err) {
      log.error('refresh failed', err)
      throw err
    }
  }

  async function fetchMe() {
    log.debug('fetchMe →')
    try {
      const res = await axios.get<AuthUser>(`${apiBase}/api/v1/me`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      user.value = res.data
      log.info('fetchMe ←', { id: res.data.id, position: res.data.position, storeId: res.data.store_id })
    } catch (err) {
      log.error('fetchMe failed', err)
      throw err
    }
  }

  async function logout() {
    log.info('logout → calling server')
    try {
      await axios.post(`${apiBase}/auth/logout`,
        { refreshToken: refreshToken.value },
        { headers: { Authorization: `Bearer ${accessToken.value}` } },
      )
      log.info('logout ← server confirmed')
    } catch (err) {
      log.warn('logout server call failed (best-effort)', err)
    }
    user.value = accessToken.value = refreshToken.value = null
    lsClear()
    log.info('logout ← local state cleared')
  }

  return { user, accessToken, refreshToken, isAuthenticated, callback, refresh, fetchMe, logout }
})

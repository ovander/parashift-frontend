import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { createDevlog } from '@/utils/logger'
import { loadLocaleMessages, LOCALE_KEY } from '@/plugins/i18n'
import { i18n } from '@/plugins/i18n'

const log = createDevlog('AuthStore')

/**
 * Authentication through the backend's Backend-for-Frontend (BFF).
 *
 * The backend runs the whole OAuth flow with Socrate and keeps the tokens. The
 * browser holds only an HttpOnly session cookie it cannot read, and this store
 * holds only what GET /bff/session returns: whether there is a session and its
 * CSRF token, sent back in X-CSRF-Token on every POST, PUT, PATCH and DELETE
 * (useApi). No token, and nothing about the session, is kept in browser
 * storage (src/test/noBrowserTokens.spec.ts).
 *
 * Every call is same-origin (a relative path): the session cookie is sent to
 * the SPA's own host only.
 */

/** The body of GET /bff/session. */
interface BffSession {
  authenticated: boolean
  user?: { sub: string; email?: string; name?: string }
  csrf?: string
}

export interface AuthUser {
  id:        string
  name:      string
  position:  'admin' | 'manager' | 'employee'
  job_role?: string   // pharmacist | animator | ... — shift eligibility
  store_id?: string   // present for manager/employee, absent for admin
  locale?:   'fr' | 'en' // preferred UI locale — synced to vue-i18n on sign-in
}

/** Where the backend starts a sign-in; it redirects to Socrate and back to returnTo. */
export function loginUrl(returnTo = '/'): string {
  return `/bff/login?return_to=${encodeURIComponent(returnTo)}`
}

export const useAuthStore = defineStore('auth', () => {
  // The Parashift profile (GET /api/v1/me); null while signed out, and for a
  // Socrate account not yet linked to an employee (it claims an invite first).
  const user = ref<AuthUser | null>(null)
  const csrf = ref<string | null>(null)
  // Whether /bff/session has answered since the page loaded.
  const checked = ref(false)

  const isAuthenticated = computed(() => csrf.value !== null)

  function clear() {
    user.value = null
    csrf.value = null
  }

  /** Takes a session body; anything but an authenticated one with a CSRF token clears the state. */
  function apply(data: unknown): boolean {
    const s = data as BffSession | null
    if (s && s.authenticated === true && typeof s.csrf === 'string' && s.csrf !== '') {
      csrf.value = s.csrf
      return true
    }
    clear()
    return false
  }

  async function fetchMe() {
    log.debug('fetchMe →')
    const res = await axios.get<AuthUser>('/api/v1/me')
    user.value = res.data
    log.info('fetchMe ←', { id: res.data.id, position: res.data.position, storeId: res.data.store_id })
    await syncLocaleFromProfile(res.data)
  }

  /**
   * Asks the backend whether this browser has a session, and loads the user
   * when it does. The session's existence is the BFF's answer alone: a profile
   * that fails to load (no employee yet, API down) does not end it, so a
   * misbehaving API cannot bounce the browser between here and Socrate.
   */
  async function loadSession(): Promise<boolean> {
    try {
      const res = await axios.get<BffSession>('/bff/session')
      if (apply(res.data)) {
        try {
          await fetchMe()
        } catch (err) {
          log.warn('fetchMe failed; signed in without a Parashift profile', err)
          user.value = null
        }
      }
    } catch (err) {
      log.warn('session check failed', err)
      clear()
    }
    checked.value = true
    return isAuthenticated.value
  }

  let inflight: Promise<boolean> | null = null

  /** loadSession once per page load; concurrent callers share the request. */
  function ensureSession(): Promise<boolean> {
    if (checked.value) return Promise.resolve(isAuthenticated.value)
    inflight ??= loadSession().finally(() => { inflight = null })
    return inflight
  }

  /** Re-asks the backend (after a 401 or a CSRF refusal), sharing one request. */
  function recheckSession(): Promise<boolean> {
    inflight ??= loadSession().finally(() => { inflight = null })
    return inflight
  }

  /** Starts a sign-in: a navigation to the backend, which sends the browser to Socrate. */
  function login(returnTo = '/') {
    log.info('login → /bff/login', { returnTo })
    window.location.assign(loginUrl(returnTo))
  }

  /**
   * Persists the user's preferred locale to the backend (PATCH /me/locale),
   * then applies it to vue-i18n and localStorage. Called by the language
   * switcher so the preference survives across devices.
   */
  async function updateLocale(lang: 'fr' | 'en'): Promise<void> {
    // Non-fatal if it fails (e.g. a platform admin has no employee record).
    try {
      await axios.patch('/api/v1/me/locale', { locale: lang }, { headers: { 'X-CSRF-Token': csrf.value ?? '' } })
    } catch {
      log.warn('updateLocale: backend persistence failed, applying locale locally only')
    }
    if (user.value) user.value = { ...user.value, locale: lang }
    await applyLocale(lang)
    log.info('updateLocale ← applied', lang)
  }

  /**
   * Applies the server-side locale preference after the profile loads. Without
   * one on record (legacy rows), the locale already in use is kept.
   */
  async function syncLocaleFromProfile(profile: AuthUser): Promise<void> {
    if (!profile.locale) return
    await applyLocale(profile.locale)
    log.debug('syncLocaleFromProfile ← locale set', profile.locale)
  }

  async function applyLocale(lang: 'fr' | 'en') {
    await loadLocaleMessages(lang)
    ;(i18n.global.locale as any).value = lang
    localStorage.setItem(LOCALE_KEY, lang)
    document.documentElement.setAttribute('lang', lang)
  }

  // The backend revokes the refresh token at Socrate and ends the session.
  async function logout() {
    if (csrf.value) {
      try {
        await axios.post('/bff/logout', null, { headers: { 'X-CSRF-Token': csrf.value } })
        log.info('logout ← server confirmed')
      } catch (err) {
        log.warn('logout server call failed (best effort)', err)
      }
    }
    clear()
    checked.value = true
  }

  return {
    user,
    csrf,
    checked,
    isAuthenticated,
    ensureSession,
    loadSession,
    recheckSession,
    fetchMe,
    login,
    logout,
    updateLocale,
    syncLocaleFromProfile,
  }
})

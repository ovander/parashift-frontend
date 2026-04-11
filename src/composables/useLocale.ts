import { useI18n } from 'vue-i18n'
import { loadLocaleMessages, LOCALE_KEY, SUPPORTED_LOCALES } from '@/plugins/i18n'
import { useAuthStore } from '@/stores/auth'

export type Locale = 'fr' | 'en'
export { SUPPORTED_LOCALES, LOCALE_KEY }

/**
 * Composable for locale management.
 *
 * - setLocale() updates the i18n locale, persists to localStorage, and sets
 *   the <html lang> attribute. When the user is authenticated it also persists
 *   the preference to the backend (PATCH /me/locale) via the auth store so the
 *   preference survives across devices and sessions.
 * - SUPPORTED_LOCALES and LOCALE_KEY are re-exported so callers don't need to
 *   import from the i18n plugin directly.
 */
export function useLocale() {
  const { locale } = useI18n()
  const authStore  = useAuthStore()

  async function setLocale(lang: Locale) {
    if (authStore.isAuthenticated) {
      // Persist to backend and sync locale — updateLocale handles everything.
      await authStore.updateLocale(lang)
    } else {
      // Unauthenticated: update locally only.
      await loadLocaleMessages(lang)
      locale.value = lang
      localStorage.setItem(LOCALE_KEY, lang)
      document.documentElement.setAttribute('lang', lang)
    }
  }

  return { locale, setLocale, SUPPORTED_LOCALES }
}

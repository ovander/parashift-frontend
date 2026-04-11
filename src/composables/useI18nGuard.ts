import { useI18n } from 'vue-i18n'

/**
 * CR-4 — Runtime i18n guard.
 *
 * Emits console.error in DEV mode when a translation key is not found in
 * the active locale. In production the check is skipped (the global `missing`
 * hook in i18n.ts handles production observability via console.warn).
 *
 * Usage — call assertTranslated() before rendering or passing a key to t():
 *
 *   const { assertTranslated } = useI18nGuard()
 *   assertTranslated('errors.assignmentFailed')
 *   ui.showToast('error', t('errors.assignmentFailed'), detail)
 */
export function useI18nGuard() {
  const { te } = useI18n()

  function assertTranslated(key: string): void {
    if (import.meta.env.DEV && !te(key)) {
      console.error(
        `[i18n] Missing translation: "${key}" — add this key to locales/{locale}/<namespace>.json`,
      )
    }
  }

  return { assertTranslated }
}

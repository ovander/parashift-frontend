/**
 * Sprint 2 T2.4 / CR-4 — Tests for useI18nGuard composable
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createI18n } from 'vue-i18n'
import { withSetup } from '@/test/withSetup'
import { useI18nGuard } from '@/composables/useI18nGuard'

function makeI18n(messages = {}) {
  return createI18n({
    legacy: false,
    locale: 'fr',
    fallbackLocale: 'en',
    messages: {
      fr: messages,
      en: {},
    },
  })
}

describe('useI18nGuard', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('does NOT call console.error when the key exists', () => {
    const i18n = makeI18n({ errors: { unknown: 'Une erreur inattendue' } })
    const [guard] = withSetup(() => useI18nGuard(), { plugins: [i18n] })

    guard.assertTranslated('errors.unknown')

    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('calls console.error in DEV mode when the key is missing', () => {
    // import.meta.env.DEV is true in vitest by default
    const i18n = makeI18n({}) // no keys
    const [guard] = withSetup(() => useI18nGuard(), { plugins: [i18n] })

    guard.assertTranslated('errors.unknownKey')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('errors.unknownKey'),
    )
  })

  it('error message contains the missing key name', () => {
    const i18n = makeI18n({})
    const [guard] = withSetup(() => useI18nGuard(), { plugins: [i18n] })

    guard.assertTranslated('config.coverage.missingKey')

    const call = consoleErrorSpy.mock.calls[0][0] as string
    expect(call).toContain('config.coverage.missingKey')
  })
})

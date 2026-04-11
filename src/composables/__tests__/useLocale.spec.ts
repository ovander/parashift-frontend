/**
 * Sprint 1 T1.2 — Tests for useLocale composable
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import { withSetup } from '@/test/withSetup'
import { useLocale, LOCALE_KEY } from '@/composables/useLocale'

function makeI18n(locale: 'fr' | 'en' = 'fr') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: {
      fr: { common: { save: 'Enregistrer' } },
      en: { common: { save: 'Save' } },
    },
  })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('lang')
})

describe('useLocale', () => {
  it('exposes the current locale as a ref', () => {
    const i18n = makeI18n('fr')
    const [result] = withSetup(() => useLocale(), { plugins: [createPinia(), i18n] })
    expect(result.locale.value).toBe('fr')
  })

  it('setLocale updates locale ref', async () => {
    const i18n = makeI18n('fr')
    const [result] = withSetup(() => useLocale(), { plugins: [createPinia(), i18n] })
    await result.setLocale('en')
    expect(result.locale.value).toBe('en')
  })

  it('setLocale persists the locale to localStorage', async () => {
    const i18n = makeI18n('fr')
    const [result] = withSetup(() => useLocale(), { plugins: [createPinia(), i18n] })
    await result.setLocale('en')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('en')
  })

  it('setLocale updates the <html lang> attribute', async () => {
    const i18n = makeI18n('fr')
    const [result] = withSetup(() => useLocale(), { plugins: [createPinia(), i18n] })
    await result.setLocale('en')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
  })

  it('exports SUPPORTED_LOCALES containing fr and en', () => {
    const i18n = makeI18n('fr')
    const [result] = withSetup(() => useLocale(), { plugins: [createPinia(), i18n] })
    expect(result.SUPPORTED_LOCALES).toContain('fr')
    expect(result.SUPPORTED_LOCALES).toContain('en')
  })
})

/**
 * Sprint 1 T1.1 — Tests for loadPersistedLocale() and loadLocaleMessages()
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadPersistedLocale, LOCALE_KEY, SUPPORTED_LOCALES } from '@/plugins/i18n'

// localStorage is stubbed in src/test/setup.ts
beforeEach(() => {
  localStorage.clear()
  // Reset navigator.language to a neutral value
  Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true })
})

describe('loadPersistedLocale', () => {
  it('returns persisted locale "fr" from localStorage', () => {
    localStorage.setItem(LOCALE_KEY, 'fr')
    expect(loadPersistedLocale()).toBe('fr')
  })

  it('returns persisted locale "en" from localStorage', () => {
    localStorage.setItem(LOCALE_KEY, 'en')
    expect(loadPersistedLocale()).toBe('en')
  })

  it('ignores invalid persisted values and falls back to browser language', () => {
    localStorage.setItem(LOCALE_KEY, 'de')
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    expect(loadPersistedLocale()).toBe('en')
  })

  it('uses browser language "en" when no localStorage value is set', () => {
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    expect(loadPersistedLocale()).toBe('en')
  })

  it('defaults to "fr" when browser language is neither fr nor en', () => {
    Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true })
    expect(loadPersistedLocale()).toBe('fr')
  })

  it('defaults to "fr" when no localStorage and no recognised browser language', () => {
    Object.defineProperty(navigator, 'language', { value: '', configurable: true })
    expect(loadPersistedLocale()).toBe('fr')
  })
})

describe('SUPPORTED_LOCALES', () => {
  it('contains fr and en', () => {
    expect(SUPPORTED_LOCALES).toContain('fr')
    expect(SUPPORTED_LOCALES).toContain('en')
    expect(SUPPORTED_LOCALES).toHaveLength(2)
  })
})

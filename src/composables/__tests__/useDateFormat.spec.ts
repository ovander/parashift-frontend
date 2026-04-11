/**
 * Sprint 2 T2.2 — Tests for useDateFormat composable
 */
import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import { withSetup } from '@/test/withSetup'
import { useDateFormat } from '@/composables/useDateFormat'

function makeI18n(locale: 'fr' | 'en') {
  return createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { fr: {}, en: {} } })
}

// Fixed date for deterministic assertions.
// 2026-04-09 is a Thursday.
const ISO_DATE     = '2026-04-09'
const ISO_DATETIME = '2026-04-09T14:30:00'

describe('useDateFormat — French (fr-BE)', () => {
  it('formatDate returns a French-formatted date', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('fr')] })
    const result = fmt.formatDate(ISO_DATE)
    // fr-BE: "09 avr. 2026" (month abbr may vary by environment, check for "2026")
    expect(result).toContain('2026')
    expect(result).toContain('09')
  })

  it('formatDateTime includes time portion', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('fr')] })
    const result = fmt.formatDateTime(ISO_DATETIME)
    // Should include hours and minutes e.g. "14:30" or "14 h 30"
    expect(result).toMatch(/14/)
    expect(result).toMatch(/30/)
  })

  it('formatMonthYear returns month and year only', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('fr')] })
    const result = fmt.formatMonthYear(ISO_DATE)
    expect(result).toContain('2026')
    // Should NOT contain a day number
    expect(result).not.toMatch(/\b09\b/)
  })

  it('formatWeekday returns a short weekday name', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('fr')] })
    const result = fmt.formatWeekday(ISO_DATE)
    // Thursday in French: "jeu." or similar short form
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(6)
  })

  it('formatWeekRange produces a dash-separated range', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('fr')] })
    const result = fmt.formatWeekRange('2026-04-06', '2026-04-12')
    expect(result).toContain('–')
    expect(result).toContain('2026')
  })
})

describe('useDateFormat — English (en-GB)', () => {
  it('formatDate returns an English-formatted date', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('en')] })
    const result = fmt.formatDate(ISO_DATE)
    expect(result).toContain('2026')
  })

  it('formatWeekday returns an English short weekday', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('en')] })
    const result = fmt.formatWeekday(ISO_DATE)
    // Thursday: "Thu"
    expect(result).toMatch(/Thu/i)
  })

  it('formatWeekRange includes the end year', () => {
    const [fmt] = withSetup(() => useDateFormat(), { plugins: [makeI18n('en')] })
    const result = fmt.formatWeekRange('2026-04-06', '2026-04-12')
    expect(result).toContain('2026')
    expect(result).toContain('–')
  })
})

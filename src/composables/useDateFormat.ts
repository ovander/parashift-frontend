import { computed } from 'vue'
import { useI18n }  from 'vue-i18n'

/**
 * Maps our supported locale codes to BCP 47 locale tags used by Intl.
 * fr → fr-BE (Belgian French conventions)
 * en → en-GB (ISO date ordering preferred over en-US)
 */
const BCP47: Record<string, string> = {
  fr: 'fr-BE',
  en: 'en-GB',
}

/**
 * Centralised date formatting composable.
 *
 * All formatters are reactive: they automatically re-format when the i18n
 * locale changes (e.g. after the user clicks the language switcher).
 *
 * Usage:
 *   const { formatDate, formatWeekRange } = useDateFormat()
 *   formatDate('2026-04-09')            // "09 avr. 2026" (fr) or "09 Apr 2026" (en)
 *   formatWeekRange('2026-04-06', '2026-04-12')  // "6 avr. – 12 avr. 2026"
 */
export function useDateFormat() {
  const { locale } = useI18n()
  const tag = computed(() => BCP47[locale.value] ?? 'fr-BE')

  const _date = computed(
    () => new Intl.DateTimeFormat(tag.value, { day: '2-digit', month: 'short', year: 'numeric' }),
  )
  const _dateTime = computed(
    () =>
      new Intl.DateTimeFormat(tag.value, {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
  )
  const _monthYear = computed(
    () => new Intl.DateTimeFormat(tag.value, { month: 'long', year: 'numeric' }),
  )
  const _weekday = computed(
    () => new Intl.DateTimeFormat(tag.value, { weekday: 'short' }),
  )

  function formatDate(iso: string): string {
    return _date.value.format(new Date(iso))
  }

  function formatDateTime(iso: string): string {
    return _dateTime.value.format(new Date(iso))
  }

  function formatMonthYear(iso: string): string {
    return _monthYear.value.format(new Date(iso))
  }

  function formatWeekday(iso: string): string {
    return _weekday.value.format(new Date(iso))
  }

  /**
   * Returns a formatted date range, e.g. "6 avr. – 12 avr. 2026".
   * Year is attached to the end date only to keep the string compact.
   */
  function formatWeekRange(startIso: string, endIso: string): string {
    const s    = new Date(startIso)
    const e    = new Date(endIso)
    const fmtS = new Intl.DateTimeFormat(tag.value, { month: 'short', day: 'numeric' })
    const fmtE = new Intl.DateTimeFormat(tag.value, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmtS.format(s)} – ${fmtE.format(e)}`
  }

  return { formatDate, formatDateTime, formatMonthYear, formatWeekday, formatWeekRange }
}

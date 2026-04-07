/**
 * Date utility helpers that work correctly in all UTC offsets.
 *
 * The key rule: ISO date-only strings like "2026-03-30" are parsed by JavaScript
 * as UTC midnight, not local midnight. Calling `.toISOString().split('T')[0]`
 * on a local-midnight Date in UTC+ zones returns the previous calendar day.
 * All functions here use local calendar parts (getFullYear/Month/Date + 'T00:00:00')
 * to avoid this class of bugs.
 */

/** Format a Date using LOCAL calendar parts — avoids UTC-offset date shifting. */
export function fmtLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Add `days` to an ISO date string (YYYY-MM-DD) and return the result.
 * Parses as local midnight so the arithmetic operates on calendar days
 * regardless of the user's UTC offset.
 */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return fmtLocal(d)
}

/**
 * Return the Monday of the ISO week containing `date`, formatted as YYYY-MM-DD.
 * Uses local calendar parts so the result is never off by one in UTC+ zones.
 */
export function toISOMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // adjust to Monday
  d.setDate(d.getDate() + diff)
  return fmtLocal(d)
}

/**
 * Return the first Monday on or after `date`, formatted as YYYY-MM-DD.
 * If `date` is already a Monday, it is returned unchanged.
 *
 * This is used as the A/B-week anchor: the first full working week starting
 * from the employee's start date is always week index 0 (= "A").
 */
export function nextMondayOnOrAfter(date: Date): string {
  const d = new Date(date)
  // (8 - weekday) % 7 → Mon=0, Tue=6, Wed=5, Thu=4, Fri=3, Sat=2, Sun=1
  const daysAhead = (8 - d.getDay()) % 7
  d.setDate(d.getDate() + daysAhead)
  return fmtLocal(d)
}

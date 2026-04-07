/**
 * ICS / iCalendar (RFC 5545) utilities.
 *
 * Extracted from MonthSchedulePdf.vue so they can be unit-tested independently.
 */

/** Format an ISO date (YYYY-MM-DD) + HH:MM time as an iCal local datetime: YYYYMMDDTHHMMSS */
export function icsDateTime(isoDate: string, hhmm: string): string {
  const [y, mo, d] = isoDate.split('-')
  const [h, m]     = hhmm.split(':')
  return `${y}${mo}${d}T${h}${m}00`
}

/** Escape text for ICS property values (RFC 5545 §3.3.11). */
export function icsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Fold a long ICS content line at 75 octets (RFC 5545 §3.1).
 * Each continuation line begins with a single SPACE character.
 */
export function icsFold(line: string): string {
  const out: string[] = []
  while (line.length > 75) {
    out.push(line.slice(0, 75))
    line = ' ' + line.slice(75)
  }
  out.push(line)
  return out.join('\r\n')
}

/**
 * Human-readable duration string from two HH:MM strings.
 * Examples: "7h", "7h30", "4h00" → "4h"
 */
export function duration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/**
 * CSS class for a shift chip based on its start hour.
 *  - Before 12:00  → 'shift-am'  (morning,   indigo)
 *  - 12:00–15:59   → 'shift-pm'  (afternoon, teal)
 *  - 16:00+        → 'shift-eve' (evening,   violet)
 */
export function shiftColor(startTime: string): string {
  const h = parseInt(startTime.split(':')[0], 10)
  if (h < 12) return 'shift-am'
  if (h < 16) return 'shift-pm'
  return 'shift-eve'
}

/**
 * ISO 8601 week number (Monday = first day of week).
 * Returns 1–53.
 */
export function isoWeek(d: Date): number {
  const tmp = new Date(d.getTime())
  tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7)
  const w1 = new Date(tmp.getFullYear(), 0, 4)
  return 1 + Math.round(
    ((tmp.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7,
  )
}

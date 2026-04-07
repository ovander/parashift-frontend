import { describe, it, expect } from 'vitest'
import { fmtLocal, addDays, toISOMonday } from '@/utils/dateUtils'

// ── fmtLocal ─────────────────────────────────────────────────────────────────

describe('fmtLocal', () => {
  it('formats a date using local calendar parts', () => {
    const d = new Date(2026, 2, 30, 10, 0, 0) // March 30 2026 (month is 0-indexed)
    expect(fmtLocal(d)).toBe('2026-03-30')
  })

  it('pads month and day with leading zeros', () => {
    const d = new Date(2026, 0, 5, 0, 0, 0) // January 5
    expect(fmtLocal(d)).toBe('2026-01-05')
  })

  it('handles end-of-year dates', () => {
    const d = new Date(2026, 11, 31, 23, 59, 59) // December 31
    expect(fmtLocal(d)).toBe('2026-12-31')
  })
})

// ── addDays ───────────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds 6 days to a Monday giving the Sunday', () => {
    expect(addDays('2026-03-30', 6)).toBe('2026-04-05')
  })

  it('adds 7 days to navigate to the next week', () => {
    expect(addDays('2026-03-30', 7)).toBe('2026-04-06')
  })

  it('subtracts 7 days to navigate to the previous week', () => {
    expect(addDays('2026-03-30', -7)).toBe('2026-03-23')
  })

  it('crosses month boundaries correctly', () => {
    expect(addDays('2026-01-28', 7)).toBe('2026-02-04')
  })

  it('crosses year boundaries correctly', () => {
    expect(addDays('2025-12-29', 7)).toBe('2026-01-05')
  })

  it('does not mutate the original date string', () => {
    const input = '2026-03-30'
    addDays(input, 7)
    expect(input).toBe('2026-03-30')
  })

  it('adding 0 returns the same date', () => {
    expect(addDays('2026-04-06', 0)).toBe('2026-04-06')
  })

  // Regression: date-only strings parsed as UTC midnight shifted by 1 day in
  // UTC+ time zones when using .toISOString(). Using local midnight parsing
  // ('T00:00:00') and fmtLocal() avoids this.
  it('is consistent: addDays(date, 7) then addDays(result, -7) returns original', () => {
    const start = '2026-04-06'
    expect(addDays(addDays(start, 7), -7)).toBe(start)
  })

  it('handles 4-week span correctly', () => {
    expect(addDays('2026-04-06', 4 * 7 - 1)).toBe('2026-05-03')
  })
})

// ── toISOMonday ───────────────────────────────────────────────────────────────

describe('toISOMonday', () => {
  it('returns same day when input is already a Monday', () => {
    const mon = new Date(2026, 2, 30, 10, 0, 0) // March 30 2026 is a Monday
    expect(toISOMonday(mon)).toBe('2026-03-30')
  })

  it('snaps a Tuesday back to Monday', () => {
    const tue = new Date(2026, 2, 31, 10, 0, 0) // March 31 (Tuesday)
    expect(toISOMonday(tue)).toBe('2026-03-30')
  })

  it('snaps a Sunday back to the previous Monday', () => {
    const sun = new Date(2026, 3, 5, 10, 0, 0) // April 5 (Sunday)
    expect(toISOMonday(sun)).toBe('2026-03-30')
  })

  it('snaps a Saturday back to Monday of same week', () => {
    const sat = new Date(2026, 3, 4, 10, 0, 0) // April 4 (Saturday)
    expect(toISOMonday(sat)).toBe('2026-03-30')
  })

  it('does not mutate the input Date', () => {
    const d = new Date(2026, 3, 4, 10, 0, 0)
    const original = d.toISOString()
    toISOMonday(d)
    expect(d.toISOString()).toBe(original)
  })
})

// ── applyPreset logic (inline simulation of PlannerToolbar behaviour) ─────────

describe('applyPreset date range logic', () => {
  // Simulates what PlannerToolbar.applyPreset does:
  //   const mon = new Date(weekStart + 'T00:00:00')
  //   const sun = new Date(mon)
  //   sun.setDate(mon.getDate() + weeks * 7 - 1)
  //   fmtLocal(mon), fmtLocal(sun)
  function presetRange(weekStart: string, weeks: number): [string, string] {
    const mon = new Date(weekStart + 'T00:00:00')
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + weeks * 7 - 1)
    return [fmtLocal(mon), fmtLocal(sun)]
  }

  it('1-week preset spans Mon–Sun of the displayed week', () => {
    const [from, to] = presetRange('2026-03-30', 1)
    expect(from).toBe('2026-03-30')
    expect(to).toBe('2026-04-05')
  })

  it('2-week preset spans two full weeks', () => {
    const [from, to] = presetRange('2026-03-30', 2)
    expect(from).toBe('2026-03-30')
    expect(to).toBe('2026-04-12')
  })

  it('4-week preset spans four full weeks', () => {
    const [from, to] = presetRange('2026-03-30', 4)
    expect(from).toBe('2026-03-30')
    expect(to).toBe('2026-04-26')
  })

  it('preset from a different week uses that week as the start', () => {
    const [from, to] = presetRange('2026-04-06', 1)
    expect(from).toBe('2026-04-06')
    expect(to).toBe('2026-04-12')
  })

  // Key regression: when the user has navigated to NEXT week in the planner
  // (weekStart = "2026-04-06"), the preset must generate for that week, not
  // for today's week (which caused assigned_count = 0 in coverage).
  it('preset always uses the displayed weekStart, not today', () => {
    const [from] = presetRange('2026-04-06', 1)
    expect(from).toBe('2026-04-06')    // must be the displayed week, not today
  })
})

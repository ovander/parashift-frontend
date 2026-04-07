import { describe, it, expect } from 'vitest'
import { icsDateTime, icsEscape, icsFold, duration, shiftColor, isoWeek } from '../icsUtils'

// ── icsDateTime ───────────────────────────────────────────────────────────────

describe('icsDateTime', () => {
  it('formats a date and time as YYYYMMDDTHHMMSS', () => {
    expect(icsDateTime('2026-04-06', '09:00')).toBe('20260406T090000')
  })

  it('handles midnight correctly', () => {
    expect(icsDateTime('2026-01-01', '00:00')).toBe('20260101T000000')
  })

  it('handles end-of-day times', () => {
    expect(icsDateTime('2026-12-31', '23:59')).toBe('20261231T235900')
  })

  it('preserves leading zeros in month and day', () => {
    expect(icsDateTime('2026-03-05', '07:30')).toBe('20260305T073000')
  })
})

// ── icsEscape ─────────────────────────────────────────────────────────────────

describe('icsEscape', () => {
  it('passes through plain text unchanged', () => {
    expect(icsEscape('Hello World')).toBe('Hello World')
  })

  it('escapes backslashes', () => {
    expect(icsEscape('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  it('escapes semicolons', () => {
    expect(icsEscape('a;b;c')).toBe('a\\;b\\;c')
  })

  it('escapes commas', () => {
    expect(icsEscape('apples,oranges')).toBe('apples\\,oranges')
  })

  it('escapes newlines', () => {
    expect(icsEscape('line1\nline2')).toBe('line1\\nline2')
  })

  it('escapes all special chars in a combined string', () => {
    expect(icsEscape('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne')
  })

  it('returns empty string unchanged', () => {
    expect(icsEscape('')).toBe('')
  })
})

// ── icsFold ───────────────────────────────────────────────────────────────────

describe('icsFold', () => {
  it('returns lines of 75 chars or fewer unchanged', () => {
    const line = 'SUMMARY:Short summary'
    expect(icsFold(line)).toBe(line)
  })

  it('returns a line of exactly 75 chars unchanged', () => {
    const line = 'A'.repeat(75)
    expect(icsFold(line)).toBe(line)
  })

  it('folds a line of 76 chars into two lines', () => {
    const line = 'A'.repeat(76)
    const folded = icsFold(line)
    const parts = folded.split('\r\n')
    expect(parts).toHaveLength(2)
    expect(parts[0]).toHaveLength(75)
    expect(parts[1]).toBe(' ' + 'A')  // continuation line starts with space
  })

  it('folds a 150-char line into three segments', () => {
    const line = 'B'.repeat(150)
    const folded = icsFold(line)
    const parts = folded.split('\r\n')
    // First: 75 chars, second: 1 space + 75 chars = 76, third: 1 space + 0 chars = space
    // Actually: line=150, first slice 0-75=75chars, remainder=' '+B*75=76chars (>75),
    // slice again 0-75 of that=76chars? No, 76 > 75 so we fold again.
    // remainder after second fold: ' ' + B*75 → length 76 → fold again
    // Actually: original=B*150
    // iter 1: push B*75, line = ' ' + B*75 (len 76)
    // iter 2: push ' '+B*74 (75 chars), line = ' ' + B (len 2)
    // iter 3: push ' '+B (len 2)
    // result: ['B*75', ' B*74', ' B'] joined by \r\n → 3 parts
    expect(parts).toHaveLength(3)
    expect(parts[0]).toHaveLength(75)
    expect(parts[1].startsWith(' ')).toBe(true)
    expect(parts[2].startsWith(' ')).toBe(true)
  })

  it('folds a realistic long UID line', () => {
    const uid = 'UID:parashift-550e8400-e29b-41d4-a716-446655440000-2026-04-06@parashift'
    // length = 71, no fold needed
    expect(icsFold(uid)).toBe(uid)
    expect(icsFold(uid).includes('\r\n')).toBe(false)
  })

  it('uses CRLF line endings for continuation lines', () => {
    const line = 'X'.repeat(100)
    const folded = icsFold(line)
    expect(folded).toContain('\r\n ')
  })
})

// ── duration ─────────────────────────────────────────────────────────────────

describe('duration', () => {
  it('returns whole-hour duration without minutes', () => {
    expect(duration('09:00', '17:00')).toBe('8h')
  })

  it('returns duration with minutes', () => {
    expect(duration('09:00', '16:30')).toBe('7h30')
  })

  it('pads single-digit minutes', () => {
    expect(duration('09:00', '09:05')).toBe('0h05')
  })

  it('handles a 30-minute shift', () => {
    expect(duration('12:00', '12:30')).toBe('0h30')
  })

  it('handles a shift starting with non-zero minutes', () => {
    expect(duration('08:15', '12:45')).toBe('4h30')
  })

  it('handles a 1-hour shift', () => {
    expect(duration('14:00', '15:00')).toBe('1h')
  })
})

// ── shiftColor ────────────────────────────────────────────────────────────────

describe('shiftColor', () => {
  it('returns shift-am for midnight start', () => {
    expect(shiftColor('00:00')).toBe('shift-am')
  })

  it('returns shift-am for a morning shift (06:00)', () => {
    expect(shiftColor('06:00')).toBe('shift-am')
  })

  it('returns shift-am for 11:59', () => {
    expect(shiftColor('11:59')).toBe('shift-am')
  })

  it('returns shift-pm for noon (12:00)', () => {
    expect(shiftColor('12:00')).toBe('shift-pm')
  })

  it('returns shift-pm for 13:30', () => {
    expect(shiftColor('13:30')).toBe('shift-pm')
  })

  it('returns shift-pm for 15:59', () => {
    expect(shiftColor('15:59')).toBe('shift-pm')
  })

  it('returns shift-eve for 16:00', () => {
    expect(shiftColor('16:00')).toBe('shift-eve')
  })

  it('returns shift-eve for an evening shift (20:00)', () => {
    expect(shiftColor('20:00')).toBe('shift-eve')
  })
})

// ── isoWeek ───────────────────────────────────────────────────────────────────

describe('isoWeek', () => {
  // ISO week 1 of 2026: Dec 29 2025 (Mon) – Jan 4 2026 (Sun)
  // Because Jan 1 2026 is a Thursday, week 1 starts the preceding Monday.
  it('returns week 1 for Jan 1 2026 (Thursday)', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
  })

  it('returns week 2 for Jan 5 2026 (Monday)', () => {
    expect(isoWeek(new Date(2026, 0, 5))).toBe(2)
  })

  it('returns week 15 for Apr 6 2026 (Easter Monday)', () => {
    expect(isoWeek(new Date(2026, 3, 6))).toBe(15)
  })

  it('returns week 53 for Dec 28 2026 (last Monday of 2026)', () => {
    // Dec 28 2026 is Monday. Dec 31 2026 is Thursday → belongs to week 53 of 2026.
    expect(isoWeek(new Date(2026, 11, 28))).toBe(53)
  })

  it('returns week 1 for Jan 4 2027 (first ISO week of 2027)', () => {
    // Jan 4 2027 is Monday of week 1/2027
    expect(isoWeek(new Date(2027, 0, 4))).toBe(1)
  })

  it('handles mid-year dates', () => {
    // Jul 6 2026 = Monday → count 26 weeks from Jan 5 (week 2): week 2 + 26 = week 28?
    // Actually count: Jan 5 is week 2. Jul 6 = day 187. Jan 5 = day 5.
    // (187 - 5) / 7 = 26 weeks. 2 + 26 = 28. Jul 6 2026 should be week 28.
    expect(isoWeek(new Date(2026, 6, 6))).toBe(28)
  })
})

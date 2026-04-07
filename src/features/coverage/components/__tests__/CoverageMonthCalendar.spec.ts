import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoverageMonthCalendar from '../CoverageMonthCalendar.vue'
import type { CoverageReport } from '@/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const emptyReport: CoverageReport = { items: [], total_slots: 0, gap_count: 0 }

function makeReport(slots: { date: string; status: string; missing_role?: boolean }[]): CoverageReport {
  return {
    items: slots.map(s => ({
      date:           s.date,
      start_time:     '09:00',
      end_time:       '17:00',
      required_count: 1,
      assigned_count: s.status === 'OK' || s.status === 'OVERSTAFFED' ? 1 : 0,
      status:         s.status,
      missing_role:   s.missing_role ?? false,
    })),
    total_slots: slots.length,
    gap_count:   slots.filter(s => s.status !== 'OK' && s.status !== 'OVERSTAFFED').length,
  }
}

/**
 * Returns all 42 calendar cells (each has data-iso and data-in-month attributes).
 * These are distinct from the 7 header cells.
 */
function calendarCells(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-iso]')
}

/**
 * Find the cell for a specific ISO date.
 */
function cellForDate(wrapper: ReturnType<typeof mount>, iso: string) {
  return wrapper.find(`[data-iso="${iso}"]`)
}

/**
 * Returns the day-of-week index where 0=Monday, 6=Sunday.
 * Compatible with the component's (getDay() + 6) % 7 normalisation.
 */
function isoDow(date: Date): number {
  return (date.getDay() + 6) % 7
}

// ── Grid structure ────────────────────────────────────────────────────────────

describe('CoverageMonthCalendar — grid structure', () => {
  it('always renders exactly 42 cells (6 rows × 7 cols)', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-04', report: emptyReport, holidays: new Map() },
    })
    expect(calendarCells(wrapper).length).toBe(42)
  })

  it('renders exactly 7 day-of-week headers', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-04', report: emptyReport, holidays: new Map() },
    })
    const headers = wrapper.findAll('.grid.grid-cols-7 > div:not([data-iso])')
    expect(headers.length).toBe(7)
    expect(headers[0].text()).toBe('Lun')
    expect(headers[6].text()).toBe('Dim')
  })

  // April 2026: 1st is Wednesday (Mon+2 → skip 2 cells)
  // Grid must start on Monday March 30, 2026.
  it('April 2026 grid starts on Monday March 30', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-04', report: emptyReport, holidays: new Map() },
    })
    const cells = calendarCells(wrapper)
    expect(cells[0].attributes('data-iso')).toBe('2026-03-30')
    expect(cells[0].text()).toContain('30')
  })

  // January 2026: 1st is Thursday (Mon+3 → skip 3 cells)
  // Grid must start on Monday December 29, 2025.
  it('January 2026 grid starts on Monday December 29, 2025', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-01', report: emptyReport, holidays: new Map() },
    })
    const cells = calendarCells(wrapper)
    expect(cells[0].attributes('data-iso')).toBe('2025-12-29')
    expect(cells[0].text()).toContain('29')
  })

  // February 2026: 1st is Sunday (Mon+6 → skip 6 cells)
  // Grid must start on Monday January 26, 2026.
  it('February 2026 grid starts on Monday January 26', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-02', report: emptyReport, holidays: new Map() },
    })
    const cells = calendarCells(wrapper)
    expect(cells[0].attributes('data-iso')).toBe('2026-01-26')
  })

  // March 2026: 1st is Sunday (Mon+6 → skip 6 cells)
  // Grid must start on Monday February 23, 2026.
  it('March 2026 grid starts on Monday February 23', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-03', report: emptyReport, holidays: new Map() },
    })
    const cells = calendarCells(wrapper)
    expect(cells[0].attributes('data-iso')).toBe('2026-02-23')
  })

  it('first grid cell is always a Monday for multiple months', () => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
    for (const month of months) {
      const wrapper = mount(CoverageMonthCalendar, {
        props: { month, report: emptyReport, holidays: new Map() },
      })
      const firstIso = calendarCells(wrapper)[0].attributes('data-iso')!
      const d = new Date(`${firstIso}T00:00:00`)
      expect(isoDow(d)).toBe(0) // 0 = Monday
    }
  })

  it('out-of-month cells have data-in-month="false"', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-04', report: emptyReport, holidays: new Map() },
    })
    const cells = calendarCells(wrapper)
    // cells[0] = Mar 30 → out of April
    expect(cells[0].attributes('data-in-month')).toBe('false')
    // cells[2] = Apr 1 → in April
    expect(cells[2].attributes('data-in-month')).toBe('true')
  })
})

// ── day-click emit ────────────────────────────────────────────────────────────

describe('CoverageMonthCalendar — day-click emit', () => {
  it('emits day-click with the ISO date when an in-month cell is clicked', async () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-04', report: emptyReport, holidays: new Map() },
      attachTo: document.body,
    })
    // April 1 = Wednesday → cells[2] (0=Mar30, 1=Mar31, 2=Apr1)
    await calendarCells(wrapper)[2].trigger('click')
    const emitted = wrapper.emitted('day-click')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual(['2026-04-01'])
  })

  it('does NOT emit day-click when an out-of-month cell is clicked', async () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-04', report: emptyReport, holidays: new Map() },
      attachTo: document.body,
    })
    // cells[0] = Mar30 (out of month), cells[1] = Mar31 (out of month)
    const cells = calendarCells(wrapper)
    await cells[0].trigger('click')
    await cells[1].trigger('click')
    expect(wrapper.emitted('day-click')).toBeFalsy()
  })
})

// ── Day status priority ───────────────────────────────────────────────────────

describe('CoverageMonthCalendar — day status and dot colors', () => {
  // April 6, 2026 = Lundi de Pâques. Use it as a fixed in-month test date.
  const testDate = '2026-04-06'

  /** Find the status dot inside the cell for testDate.
   *  The dot is the <span class="w-1.5 h-1.5 rounded-full ..."> element. */
  function dotInCell(wrapper: ReturnType<typeof mount>) {
    return cellForDate(wrapper, testDate).find('span.rounded-full')
  }

  it('shows amber-200 dot for a holiday (highest priority)', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month:    '2026-04',
        report:   makeReport([{ date: testDate, status: 'MISSING_ROLE', missing_role: true }]),
        holidays: new Map([[testDate, 'Lundi de Pâques']]),
      },
    })
    expect(dotInCell(wrapper).classes()).toContain('bg-amber-200')
  })

  it('shows purple-400 dot for missing_role when no holiday', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month:    '2026-04',
        report:   makeReport([{ date: testDate, status: 'MISSING_ROLE', missing_role: true }]),
        holidays: new Map(),
      },
    })
    expect(dotInCell(wrapper).classes()).toContain('bg-purple-400')
  })

  it('shows red-400 dot for understaffed', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month:    '2026-04',
        report:   makeReport([{ date: testDate, status: 'UNDERSTAFFED' }]),
        holidays: new Map(),
      },
    })
    expect(dotInCell(wrapper).classes()).toContain('bg-red-400')
  })

  it('shows amber-400 dot for overstaffed', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month:    '2026-04',
        report:   makeReport([{ date: testDate, status: 'OVERSTAFFED' }]),
        holidays: new Map(),
      },
    })
    expect(dotInCell(wrapper).classes()).toContain('bg-amber-400')
  })

  it('shows green-400 dot for OK', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month:    '2026-04',
        report:   makeReport([{ date: testDate, status: 'OK' }]),
        holidays: new Map(),
      },
    })
    expect(dotInCell(wrapper).classes()).toContain('bg-green-400')
  })

  it('shows gray-200 dot when no coverage data for an in-month date', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month:    '2026-04',
        report:   emptyReport,
        holidays: new Map(),
      },
    })
    expect(dotInCell(wrapper).classes()).toContain('bg-gray-200')
  })

  it('missing_role wins over understaffed on the same day', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month: '2026-04',
        report: makeReport([
          { date: testDate, status: 'MISSING_ROLE', missing_role: true },
          { date: testDate, status: 'UNDERSTAFFED' },
        ]),
        holidays: new Map(),
      },
    })
    const dot = dotInCell(wrapper)
    expect(dot.classes()).toContain('bg-purple-400')
    expect(dot.classes()).not.toContain('bg-red-400')
  })

  it('holiday wins over missing_role on the same day', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: {
        month: '2026-04',
        report: makeReport([{ date: testDate, status: 'MISSING_ROLE', missing_role: true }]),
        holidays: new Map([[testDate, 'Lundi de Pâques']]),
      },
    })
    const dot = dotInCell(wrapper)
    expect(dot.classes()).toContain('bg-amber-200')
    expect(dot.classes()).not.toContain('bg-purple-400')
  })
})

// ── Legend ────────────────────────────────────────────────────────────────────

describe('CoverageMonthCalendar — legend', () => {
  it('renders all 6 legend entries', () => {
    const wrapper = mount(CoverageMonthCalendar, {
      props: { month: '2026-04', report: emptyReport, holidays: new Map() },
    })
    const text = wrapper.text()
    expect(text).toContain('OK')
    expect(text).toContain('Understaffed')
    expect(text).toContain('Missing role')
    expect(text).toContain('Overstaffed')
    expect(text).toContain('No requirement')
    expect(text).toContain('Jour férié')
  })
})

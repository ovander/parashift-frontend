import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoverageHeatmap from '../CoverageHeatmap.vue'
import type { CoverageReport } from '@/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const emptyReport: CoverageReport = {
  items:       [],
  total_slots: 0,
  gap_count:   0,
}

function makeReport(dates: string[]): CoverageReport {
  return {
    items: dates.map((date) => ({
      date,
      start_time:     '09:00',
      end_time:       '17:00',
      required_count: 2,
      assigned_count: 2,
      status:         'OK',
      missing_role:   false,
    })),
    total_slots: dates.length,
    gap_count:   0,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CoverageHeatmap', () => {

  // ── Holiday prop — amber row rendering ────────────────────────────────────

  it('renders an amber holiday row when holidays prop contains a date', () => {
    const holidays = new Map([['2026-04-06', 'Lundi de Pâques']])
    const wrapper = mount(CoverageHeatmap, {
      props: { report: emptyReport, holidays },
    })
    expect(wrapper.text()).toContain('Lundi de Pâques')
  })

  it('renders the "Public holiday" label inside a holiday row', () => {
    const holidays = new Map([['2026-04-06', 'Lundi de Pâques']])
    const wrapper = mount(CoverageHeatmap, {
      props: { report: emptyReport, holidays },
    })
    expect(wrapper.text()).toContain('Public holiday')
  })

  it('applies amber background classes to the holiday row', () => {
    const holidays = new Map([['2026-04-06', 'Fête du Travail']])
    const wrapper = mount(CoverageHeatmap, {
      props: { report: emptyReport, holidays },
    })
    const amberRow = wrapper.find('.bg-amber-50')
    expect(amberRow.exists()).toBe(true)
  })

  it('renders the holiday emoji 🎉 in the row', () => {
    const holidays = new Map([['2026-05-01', 'Fête du Travail']])
    const wrapper = mount(CoverageHeatmap, {
      props: { report: emptyReport, holidays },
    })
    expect(wrapper.html()).toContain('🎉')
  })

  // ── No holidays → normal coverage rows only ────────────────────────────────

  it('renders normal coverage rows when no holidays prop is given', () => {
    const report = makeReport(['2026-04-06'])
    const wrapper = mount(CoverageHeatmap, { props: { report } })
    // The holiday banner row (h-7 full-width banner) must not appear;
    // the legend always contains 'Jour férié' so we check for the 🎉 emoji
    // which only appears inside actual holiday rows, not in the legend.
    expect(wrapper.html()).not.toContain('🎉')
  })

  it('renders normal coverage rows when holidays prop is an empty Map', () => {
    const report  = makeReport(['2026-04-06'])
    const wrapper = mount(CoverageHeatmap, {
      props: { report, holidays: new Map() },
    })
    expect(wrapper.html()).not.toContain('🎉')
  })

  // ── allDays: union of coverage dates + holiday dates ──────────────────────

  it('includes holiday dates that are not in the coverage report', () => {
    // Coverage report has no items; holidays map has one date
    const holidays = new Map([['2026-04-06', 'Lundi de Pâques']])
    const wrapper = mount(CoverageHeatmap, {
      props: { report: emptyReport, holidays },
    })
    // The date should appear in the rendered output (day label column)
    const html = wrapper.html()
    expect(html).toBeTruthy()
    // We can't directly inspect allDays, but the row for the holiday date IS rendered
    expect(wrapper.text()).toContain('Lundi de Pâques')
  })

  it('renders both coverage rows and holiday rows when dates differ', () => {
    const report   = makeReport(['2026-04-07'])           // coverage on Tuesday
    const holidays = new Map([['2026-04-06', 'Lundi de Pâques']]) // holiday on Monday
    const wrapper  = mount(CoverageHeatmap, { props: { report, holidays } })

    // Both the holiday name and the Public holiday label must appear
    expect(wrapper.text()).toContain('Lundi de Pâques')
    expect(wrapper.text()).toContain('Public holiday')
    // At least one normal coverage cell (bg-gray-100 = empty slot) must exist
    expect(wrapper.find('.bg-gray-100').exists()).toBe(true)
  })

  // ── Legend ─────────────────────────────────────────────────────────────────

  it('includes a Public holiday legend entry', () => {
    const wrapper = mount(CoverageHeatmap, { props: { report: emptyReport } })
    // The legend always appears regardless of whether holidays are present
    expect(wrapper.text()).toContain('Public holiday')
  })

  // ── Summary row ────────────────────────────────────────────────────────────

  it('displays total_slots and gap_count from the report', () => {
    const report: CoverageReport = { ...emptyReport, total_slots: 14, gap_count: 3 }
    const wrapper = mount(CoverageHeatmap, { props: { report } })
    expect(wrapper.text()).toContain('14')
    expect(wrapper.text()).toContain('3')
  })

  it('highlights gap_count in red when greater than 0', () => {
    const report: CoverageReport = { ...emptyReport, gap_count: 2 }
    const wrapper = mount(CoverageHeatmap, { props: { report } })
    // The span containing the gap count should carry text-red-600
    const gapEl = wrapper.find('.text-red-600')
    expect(gapEl.exists()).toBe(true)
  })

  it('does not apply red highlighting when gap_count is 0', () => {
    const wrapper = mount(CoverageHeatmap, { props: { report: emptyReport } })
    expect(wrapper.find('.text-red-600').exists()).toBe(false)
  })

  // ── Multiple holidays ─────────────────────────────────────────────────────

  it('renders a row for each holiday in the map', () => {
    const holidays = new Map([
      ['2026-04-06', 'Lundi de Pâques'],
      ['2026-05-01', 'Fête du Travail'],
      ['2026-05-08', 'Victoire 1945'],
    ])
    const wrapper = mount(CoverageHeatmap, {
      props: { report: emptyReport, holidays },
    })
    expect(wrapper.text()).toContain('Lundi de Pâques')
    expect(wrapper.text()).toContain('Fête du Travail')
    expect(wrapper.text()).toContain('Victoire 1945')
  })
})

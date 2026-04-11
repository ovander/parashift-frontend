import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/stores/storeContext'
import WeekStrip from '../WeekStrip.vue'
import type { ShiftInstance, Assignment } from '@/types'

// ── Stubs / mocks ────────────────────────────────────────────────────────────
vi.mock('../ShiftCard.vue', () => ({ default: { name: 'ShiftCardStub', template: '<div class="shift-card-stub" />' } }))
vi.mock('@vueuse/core', () => ({ useSwipe: vi.fn(() => ({})) }))
Element.prototype.scrollIntoView = vi.fn()

// Holidays composable — default to empty; individual tests can override via
// the `mockHolidays` ref that is captured in the hoisted factory.
const mockHolidays = { value: [] as Array<{ date: string; name: string; zone: string }> }
vi.mock('@/features/schedule/composables/usePublicHolidays', () => ({
  usePublicHolidays: () => ({ holidays: mockHolidays }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
const WEEK_START = '2026-04-06'

function makeShift(date: string): ShiftInstance {
  return {
    id: `shift-${date}`, store_id: 'store-1', date,
    start_time: '09:00', end_time: '17:00', role: 'pharmacist',
    required_count: 1, status: 'PUBLISHED', source: 'TEMPLATE',
    needs_cover: false, created_at: '', updated_at: '',
  }
}

function makeAssignment(date: string, employeeId = 'me'): Assignment {
  return {
    id: `assn-${date}`, store_id: 'store-1',
    shift_id: `shift-${date}`, employee_id: employeeId,
    shift_date: date, shift_start_time: '09:00', shift_end_time: '17:00',
    violations: [], created_at: '',
  }
}

// ── Shared pinia — set once per test so component sees same stores ────────────
let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
  mockHolidays.value = []  // reset to no holidays

  const auth    = useAuthStore()
  auth.user     = { id: 'me', name: 'Me', position: 'employee' }
  const ctx     = useStoreContext()
  ctx.weekStart = WEEK_START
  ctx.setStore('store-1')
})

function mountStrip() {
  return mount(WeekStrip, {
    props: { storeId: 'store-1' },
    global: {
      plugins: [pinia],   // ← same pinia, so store state is shared
      stubs: {
        Skeleton:     { name: 'Skeleton', template: '<div class="skeleton-stub" role="progressbar" />' },
        ShiftCardStub: true,
      },
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WeekStrip', () => {

  it('renders 7 day cards when not loading', () => {
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    expect(wrapper.findAll('[data-day]')).toHaveLength(7)
  })

  it('renders skeleton placeholders while loading', () => {
    useScheduleStore().loading = true
    const wrapper = mountStrip()
    expect(wrapper.findAll('.skeleton-stub').length).toBeGreaterThan(0)
    expect(wrapper.findAll('[data-day]')).toHaveLength(0)
  })

  // Sprint 1.2 / UX polish: role is NOT shown in the employee week-strip card
  it('does not display the shift role in the day card (employee view)', () => {
    const sched = useScheduleStore()
    sched.loading     = false
    sched.shifts      = [makeShift('2026-04-06')]
    sched.assignments = [makeAssignment('2026-04-06')]
    const wrapper = mountStrip()
    // Role should not appear in the strip cards; times should still be visible
    expect(wrapper.text()).not.toContain('pharmacist')
    expect(wrapper.text()).toContain('09:00')
  })

  it('shows a "Day off" indicator on days with no assignment', () => {
    const sched = useScheduleStore()
    sched.loading = false
    sched.shifts  = sched.assignments = []
    const wrapper = mountStrip()
    // The moon icon (pi-moon) is shown once per day card that has no shift/leave/holiday
    expect(wrapper.findAll('.pi-moon')).toHaveLength(7)
  })

  // Sprint 3.1: auto-select today ────────────────────────────────────────────
  it('auto-selects today when it falls in current week', () => {
    vi.setSystemTime(new Date('2026-04-06T10:00:00Z'))
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    expect(wrapper.find('[data-day="2026-04-06"]').classes()).toContain('border-brand-500')
    vi.useRealTimers()
  })

  it('falls back to Monday when today is outside the week', () => {
    vi.setSystemTime(new Date('2026-04-20T10:00:00Z'))
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    expect(wrapper.find('[data-day="2026-04-06"]').classes()).toContain('border-brand-500')
    vi.useRealTimers()
  })

  it('clicking a day card selects it', async () => {
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    await wrapper.find('[data-day="2026-04-08"]').trigger('click')
    expect(wrapper.find('[data-day="2026-04-08"]').classes()).toContain('border-brand-500')
  })

  it('shows ShiftCard when the selected day has an assignment', async () => {
    vi.setSystemTime(new Date('2026-04-06T10:00:00Z'))
    const sched = useScheduleStore()
    sched.loading     = false
    sched.shifts      = [makeShift('2026-04-06')]
    sched.assignments = [makeAssignment('2026-04-06', 'me')]
    const wrapper = mountStrip()
    // Wait a tick for the computed to evaluate
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.shift-card-stub').exists()).toBe(true)
    vi.useRealTimers()
  })

  it('shows "Day off" when selected day has no assignment', async () => {
    vi.setSystemTime(new Date('2026-04-06T10:00:00Z'))
    const sched = useScheduleStore()
    sched.loading = false
    sched.shifts  = sched.assignments = []
    const wrapper = mountStrip()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Day off')
    vi.useRealTimers()
  })

  // Sprint 3.2: scroll into view ─────────────────────────────────────────────
  it('calls scrollIntoView after selecting a new day', async () => {
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    await wrapper.find('[data-day="2026-04-09"]').trigger('click')
    await new Promise((r) => setTimeout(r, 20))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  // Sprint 4: public holiday badge ───────────────────────────────────────────

  it('renders a holiday badge on a day card when that day is a public holiday', async () => {
    // Apr 6 2026 (Monday, first day of the week) = Easter Monday
    mockHolidays.value = [{ date: '2026-04-06', name: 'Lundi de Pâques', zone: 'metropole' }]
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    await wrapper.vm.$nextTick()

    // The badge is inside the [data-day="2026-04-06"] card
    const card = wrapper.find('[data-day="2026-04-06"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('Lundi de Pâques')
  })

  it('renders the 🎉 emoji in the holiday badge', async () => {
    mockHolidays.value = [{ date: '2026-04-06', name: 'Lundi de Pâques', zone: 'metropole' }]
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-day="2026-04-06"]').html()).toContain('🎉')
  })

  it('does NOT render a holiday badge on days without a holiday', async () => {
    mockHolidays.value = [{ date: '2026-04-06', name: 'Lundi de Pâques', zone: 'metropole' }]
    useScheduleStore().loading = false
    const wrapper = mountStrip()
    await wrapper.vm.$nextTick()

    // Tuesday (Apr 7) should have no holiday badge
    const tuesday = wrapper.find('[data-day="2026-04-07"]')
    expect(tuesday.text()).not.toContain('Lundi de Pâques')
    expect(tuesday.html()).not.toContain('🎉')
  })

  it('shows the "Public holiday" detail panel (not "Day off") when selected day is a holiday with no shift', async () => {
    vi.setSystemTime(new Date('2026-04-06T10:00:00Z'))
    mockHolidays.value = [{ date: '2026-04-06', name: 'Lundi de Pâques', zone: 'metropole' }]
    const sched = useScheduleStore()
    sched.loading = false
    sched.shifts  = sched.assignments = []

    const wrapper = mountStrip()
    await new Promise((r) => setTimeout(r, 0))

    // Should show the holiday name and "Public holiday" label in the detail panel.
    // (Other unselected day cards will still show "Day off" for days without shifts —
    //  we only care that the selected holiday day shows its holiday info correctly.)
    expect(wrapper.text()).toContain('Lundi de Pâques')
    expect(wrapper.text()).toContain('Public holiday')
    vi.useRealTimers()
  })

  it('shows "Public holiday" subtitle on the day card when it is a holiday and there is no assignment', async () => {
    // This exercises the v-else-if="day.holiday" branch in the day card template
    mockHolidays.value = [{ date: '2026-04-06', name: 'Lundi de Pâques', zone: 'metropole' }]
    const sched = useScheduleStore()
    sched.loading = false
    sched.shifts  = sched.assignments = []
    const wrapper = mountStrip()
    await wrapper.vm.$nextTick()

    // The day card itself should say "Public holiday" instead of "Day off"
    const card = wrapper.find('[data-day="2026-04-06"]')
    expect(card.text()).toContain('Public holiday')
    expect(card.text()).not.toContain('Day off')
  })
})

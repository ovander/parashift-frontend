import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useAuthStore } from '@/stores/auth'
import ShiftCard from '../ShiftCard.vue'
import type { Assignment, ShiftInstance } from '@/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('@/features/swap/components/SwapRequestDialog.vue', () => ({
  default: {
    name: 'SwapRequestDialog',
    template: '<div class="swap-dialog-stub" />',
    props: ['shiftId', 'storeId', 'initialTargetId', 'visible'],
    emits: ['update:visible'],
  },
}))

const STUBS = {
  Card:   { template: '<div class="card"><slot name="header"/><div class="content"><slot name="content"/></div><slot name="footer"/></div>' },
  Button: { template: '<button @click="$emit(\'click\')" :disabled="loading">{{ label }}</button>', props: ['label', 'icon', 'size', 'severity', 'outlined', 'loading'], emits: ['click'] },
  Tag:    { template: '<span :class="[\'tag\', severity]">{{ value }}</span>', props: ['severity', 'value'] },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1', store_id: 'store-1', shift_id: 'shift-1',
    employee_id: 'me', shift_date: '2026-04-06',
    shift_start_time: '09:00', shift_end_time: '17:00',
    violations: [], created_at: '',
    ...overrides,
  }
}

function makeShift(overrides: Partial<ShiftInstance> = {}): ShiftInstance {
  return {
    id: 'shift-1', store_id: 'store-1', date: '2026-04-06',
    start_time: '09:00', end_time: '17:00', role: 'pharmacist',
    required_count: 1, status: 'PUBLISHED', source: 'TEMPLATE',
    needs_cover: false, created_at: '', updated_at: '',
    ...overrides,
  }
}

function makeEmp(id: string, name: string) {
  return {
    id, store_id: 'store-1', name, position: 'employee' as const,
    job_role: 'pharmacist', email: `${id}@t.com`,
    contract_hours_per_week: 35, created_at: '', updated_at: '',
  }
}

// ── Shared Pinia ──────────────────────────────────────────────────────────────
let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  useAuthStore().user = { id: 'me', name: 'Me', position: 'employee' }
})

function mountCard(assignment: Partial<Assignment> = {}, shift: Partial<ShiftInstance> = {}) {
  const sched       = useScheduleStore()
  sched.shifts      = [makeShift(shift)]
  sched.assignments = [makeAssignment(assignment)]
  return mount(ShiftCard, {
    props: { assignment: makeAssignment(assignment), storeId: 'store-1' },
    global: { plugins: [pinia], stubs: STUBS },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShiftCard', () => {

  // Sprint 1.4 ────────────────────────────────────────────────────────────────
  it('renders shift role from ShiftInstance.role', () => {
    const wrapper = mountCard({}, { role: 'pharmacist' })
    expect(wrapper.text()).toContain('pharmacist')
  })

  it('renders shift time range', () => {
    const wrapper = mountCard({}, { start_time: '08:00', end_time: '16:00' })
    expect(wrapper.text()).toContain('08:00')
    expect(wrapper.text()).toContain('16:00')
  })

  // Sprint 5.1 ────────────────────────────────────────────────────────────────
  it('renders shift notes when present', () => {
    const sched       = useScheduleStore()
    sched.shifts      = [{ ...makeShift(), notes: 'Bring your badge' } as any]
    sched.assignments = [makeAssignment()]
    const wrapper = mount(ShiftCard, {
      props: { assignment: makeAssignment(), storeId: 'store-1' },
      global: { plugins: [pinia], stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Bring your badge')
  })

  it('does not render notes section when notes are absent', () => {
    const wrapper = mountCard()
    expect(wrapper.find('.pi-info-circle').exists()).toBe(false)
  })

  // Sprint 5.2 ────────────────────────────────────────────────────────────────
  it('shows "Confirm shift" for PUBLISHED unacknowledged shift', () => {
    const wrapper = mountCard({}, { status: 'PUBLISHED' })
    expect(wrapper.text()).toContain('Confirm shift')
  })

  it('does not show "Confirm shift" for DRAFT shift', () => {
    const wrapper = mountCard({}, { status: 'DRAFT' })
    expect(wrapper.text()).not.toContain('Confirm shift')
  })

  it('hides "Confirm shift" and shows "Confirmed" once acknowledged', () => {
    const sched = useScheduleStore()
    sched.shifts = [makeShift({ status: 'PUBLISHED' })]
    const assn   = makeAssignment({ acknowledged_at: '2026-04-06T10:00:00Z' })
    sched.assignments = [assn]
    const wrapper = mount(ShiftCard, {
      props: { assignment: assn, storeId: 'store-1' },
      global: { plugins: [pinia], stubs: STUBS },
    })
    expect(wrapper.text()).not.toContain('Confirm shift')
    expect(wrapper.text()).toContain('Confirmed')
  })

  it('shows "Pending confirmation" tag for unacknowledged PUBLISHED shift', () => {
    const wrapper = mountCard({ acknowledged_at: undefined }, { status: 'PUBLISHED' })
    expect(wrapper.text()).toContain('Pending confirmation')
  })

  // Sprint 5.3 ────────────────────────────────────────────────────────────────
  it('lists colleague names on the same shift', () => {
    const sched = useScheduleStore()
    sched.shifts      = [makeShift()]
    sched.assignments = [
      makeAssignment({ id: 'a1', employee_id: 'me' }),
      makeAssignment({ id: 'a2', employee_id: 'emp-2' }),
    ]
    useEmployeeStore().employees = [makeEmp('me', 'Me'), makeEmp('emp-2', 'Bob')]
    const wrapper = mount(ShiftCard, {
      props: { assignment: makeAssignment(), storeId: 'store-1' },
      global: { plugins: [pinia], stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Bob')
  })

  it('does not list the current user as their own colleague', () => {
    const sched = useScheduleStore()
    sched.shifts      = [makeShift()]
    sched.assignments = [makeAssignment({ employee_id: 'me' })]
    useEmployeeStore().employees = [makeEmp('me', 'Myself')]
    const wrapper = mount(ShiftCard, {
      props: { assignment: makeAssignment(), storeId: 'store-1' },
      global: { plugins: [pinia], stubs: STUBS },
    })
    expect(wrapper.find('.pi-users').exists()).toBe(false)
  })

  it('clicking a colleague button triggers the swap dialog', async () => {
    const sched = useScheduleStore()
    sched.shifts      = [makeShift()]
    sched.assignments = [
      makeAssignment({ id: 'a1', employee_id: 'me' }),
      makeAssignment({ id: 'a2', employee_id: 'emp-2' }),
    ]
    useEmployeeStore().employees = [makeEmp('me', 'Me'), makeEmp('emp-2', 'Bob')]
    const wrapper = mount(ShiftCard, {
      props: { assignment: makeAssignment(), storeId: 'store-1' },
      global: { plugins: [pinia], stubs: STUBS },
    })
    // Find the colleague toggle button by text content
    const allBtns    = wrapper.findAll('button')
    const colBtn     = allBtns.find((b) => b.text().includes('Bob'))
    expect(colBtn).toBeDefined()
    await colBtn!.trigger('click')
    // After click, the swap dialog should exist in the tree
    const dialog = wrapper.findComponent({ name: 'SwapRequestDialog' })
    expect(dialog.exists()).toBe(true)
  })
})

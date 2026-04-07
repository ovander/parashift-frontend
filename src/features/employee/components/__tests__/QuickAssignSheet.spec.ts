import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import QuickAssignSheet from '../QuickAssignSheet.vue'
import type { ShiftInstance, Employee } from '@/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('@/stores/storeContext', () => ({ useStoreContext: () => ({ storeId: 'store-1' }) }))

const STUBS = {
  // Stub InputText to a plain <input> so v-model works
  InputText: {
    name: 'InputText',
    template: '<input class="qs-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
  Skeleton: { name: 'Skeleton', template: '<div class="skeleton-stub" role="progressbar" />' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeShift(role = 'pharmacist'): ShiftInstance {
  return {
    id: 'shift-1', store_id: 'store-1', date: '2026-04-06',
    start_time: '09:00', end_time: '17:00', role,
    required_count: 1, status: 'PUBLISHED', source: 'TEMPLATE',
    needs_cover: false, created_at: '', updated_at: '',
  }
}

function makeEmployee(id: string, name: string, job_role: string): Employee {
  return {
    id, store_id: 'store-1', name, position: 'employee',
    job_role, email: `${id}@test.com`, contract_hours_per_week: 35,
    created_at: '', updated_at: '',
  }
}

let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
})

function mountSheet(shift: ShiftInstance, employees: Employee[] = []) {
  useEmployeeStore().employees = employees
  return mount(QuickAssignSheet, {
    props: { shift },
    global: { plugins: [pinia], stubs: STUBS },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuickAssignSheet', () => {

  it('shows only employees whose job_role matches the shift role', () => {
    const wrapper = mountSheet(makeShift('pharmacist'), [
      makeEmployee('e1', 'Alice', 'pharmacist'),
      makeEmployee('e2', 'Bob',   'logistics_agent'),
    ])
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).not.toContain('Bob')
  })

  it('filters the list by name search query', async () => {
    const wrapper = mountSheet(makeShift('pharmacist'), [
      makeEmployee('e1', 'Alice Smith',   'pharmacist'),
      makeEmployee('e2', 'Bob Pharmacist', 'pharmacist'),
    ])
    const input = wrapper.find('.qs-input')
    await input.setValue('alice')
    await input.trigger('input')
    expect(wrapper.text()).toContain('Alice Smith')
    expect(wrapper.text()).not.toContain('Bob Pharmacist')
  })

  // Sprint 2.2: empty states ─────────────────────────────────────────────────
  it('shows role-specific message when no employee has that role', () => {
    const wrapper = mountSheet(makeShift('pharmacist'), [
      makeEmployee('e1', 'Alice', 'logistics_agent'),
    ])
    expect(wrapper.text()).toMatch(/no employees with role/i)
    expect(wrapper.text()).toContain('pharmacist')
  })

  it('shows search-specific message when search yields no match', async () => {
    const wrapper = mountSheet(makeShift('pharmacist'), [
      makeEmployee('e1', 'Alice', 'pharmacist'),
    ])
    const input = wrapper.find('.qs-input')
    await input.setValue('zzz')
    await input.trigger('input')
    expect(wrapper.text()).toMatch(/no match for/i)
    expect(wrapper.text()).toContain('zzz')
  })

  it('does NOT show the role empty state when there are matching employees', () => {
    const wrapper = mountSheet(makeShift('pharmacist'), [
      makeEmployee('e1', 'Alice', 'pharmacist'),
    ])
    expect(wrapper.text()).not.toMatch(/no employees with role/i)
  })

  it('shows loading skeletons while employeeStore is loading', () => {
    useEmployeeStore().loading = true
    const wrapper = mountSheet(makeShift())
    expect(wrapper.findAll('.skeleton-stub').length).toBeGreaterThan(0)
  })

  it('emits "assigned" event after a successful assignment', async () => {
    const empStore     = useEmployeeStore()
    empStore.employees = [makeEmployee('e1', 'Alice', 'pharmacist')]
    const sched        = useScheduleStore()
    sched.assign       = vi.fn().mockResolvedValue([])
    const wrapper      = mountSheet(makeShift(), empStore.employees)

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Alice'))
    await btn?.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.emitted('assigned')).toBeTruthy()
  })

  it('does NOT emit "assigned" when assignment fails', async () => {
    const empStore     = useEmployeeStore()
    empStore.employees = [makeEmployee('e1', 'Alice', 'pharmacist')]
    const sched        = useScheduleStore()
    sched.assign       = vi.fn().mockRejectedValue(new Error('server error'))
    const wrapper      = mountSheet(makeShift(), empStore.employees)

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Alice'))
    await btn?.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.emitted('assigned')).toBeFalsy()
  })
})

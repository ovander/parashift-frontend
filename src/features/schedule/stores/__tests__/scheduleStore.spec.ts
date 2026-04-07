import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Assignment, RuleViolation, RuleViolationKey } from '@/types'

// ── Hoist mocks BEFORE imports (vi.mock is hoisted) ──────────────────────────
const { mockPost, mockDelete, mockGet, mockFetchCoverage } = vi.hoisted(() => ({
  mockPost:          vi.fn(),
  mockDelete:        vi.fn(),
  mockGet:           vi.fn(),
  mockFetchCoverage: vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({
  useScheduleApi: () => ({ post: mockPost, delete: mockDelete, get: mockGet }),
  default: { get: mockGet },
}))
vi.mock('@/features/coverage/stores/coverageStore', () => ({
  useCoverageStore: () => ({ fetchCoverage: mockFetchCoverage }),
}))
vi.mock('@/stores/ui', () => ({
  useUiStore: () => ({ showToast: vi.fn(), setLoading: vi.fn() }),
}))

// ── Import AFTER mocks are registered ────────────────────────────────────────
import { useScheduleStore, BlockingViolationError } from '@/features/schedule/stores/scheduleStore'

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id:               'a1',
    store_id:         'store1',
    shift_id:         's1',
    employee_id:      'e1',
    shift_date:       '2026-03-30',
    shift_start_time: '08:00',
    shift_end_time:   '16:00',
    violations:       [],
    created_at:       '2026-03-30T08:00:00Z',
    ...overrides,
  }
}

function makeViolation(severity: RuleViolation['severity']): RuleViolation {
  return {
    rule_id:     'r1',
    rule_type:   'MAX_HOURS',
    severity,
    message:     `${severity} violation`,
    shift_id:    's1',
    employee_id: 'e1',
  }
}

function key(shiftId: string, employeeId: string): RuleViolationKey {
  return { shiftId, employeeId }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('scheduleStore', () => {
  describe('fetchWeek', () => {
    it('populates shifts and assignments from API', async () => {
      const store = useScheduleStore()
      mockGet.mockImplementation((url: string) => {
        if (url.includes('shifts'))      return Promise.resolve({ data: [{ id: 's1' }] })
        if (url.includes('assignments')) return Promise.resolve({ data: [makeAssignment()] })
        return Promise.resolve({ data: [] })
      })
      await store.fetchWeek('store1', '2026-03-30')
      expect(store.shifts).toHaveLength(1)
      expect(store.assignments).toHaveLength(1)
    })

    it('clears violations on each fetch', async () => {
      const store = useScheduleStore()
      mockGet.mockResolvedValue({ data: [] })
      const { useRuleViolations } = await import('@/features/schedule/composables/useRuleViolations')
      useRuleViolations().setViolations(key('s1', 'e1'), [makeViolation('BLOCKING')])
      await store.fetchWeek('store1', '2026-03-30')
      expect(useRuleViolations().getViolations(key('s1', 'e1'))).toEqual([])
    })
  })

  describe('assign — optimistic updates', () => {
    it('adds assignment optimistically before API resolves', async () => {
      const store = useScheduleStore()
      let resolvePost!: (v: any) => void
      mockPost.mockReturnValue(new Promise((r) => { resolvePost = r }))

      const assignPromise = store.assign('store1', 's1', 'e1')
      expect(store.assignments.some((a) => a.shift_id === 's1' && a.employee_id === 'e1')).toBe(true)

      resolvePost({ data: makeAssignment() })
      await assignPromise
    })

    it('replaces optimistic entry with server response on success', async () => {
      const store = useScheduleStore()
      mockPost.mockResolvedValue({ data: makeAssignment({ id: 'server-id' }) })
      await store.assign('store1', 's1', 'e1')
      expect(store.assignments.find((a) => a.id === 'server-id')).toBeDefined()
      expect(store.assignments.filter((a) => a.id.startsWith('optimistic-'))).toHaveLength(0)
    })

    it('returns empty violations array on clean assignment', async () => {
      const store = useScheduleStore()
      mockPost.mockResolvedValue({ data: makeAssignment({ violations: [] }) })
      const violations = await store.assign('store1', 's1', 'e1')
      expect(violations).toEqual([])
    })

    it('stores WARNING violations without rolling back', async () => {
      const store = useScheduleStore()
      const warning = makeViolation('WARNING')
      mockPost.mockResolvedValue({ data: makeAssignment({ violations: [warning] }) })
      const violations = await store.assign('store1', 's1', 'e1')
      expect(violations).toHaveLength(1)
      expect(violations[0].severity).toBe('WARNING')
      expect(store.assignments.some((a) => a.shift_id === 's1')).toBe(true)
    })

    it('rolls back and throws BlockingViolationError on BLOCKING violation', async () => {
      const store = useScheduleStore()
      store.assignments = [makeAssignment({ id: 'existing', shift_id: 'sx', employee_id: 'ex' })]
      mockPost.mockResolvedValue({ data: makeAssignment({ id: 'new-a', violations: [makeViolation('BLOCKING')] }) })
      await expect(store.assign('store1', 's1', 'e1')).rejects.toThrow(BlockingViolationError)
      expect(store.assignments.find((a) => a.id === 'existing')).toBeDefined()
      expect(store.assignments.filter((a) => a.shift_id === 's1' && a.employee_id === 'e1')).toHaveLength(0)
    })

    it('rolls back on network error', async () => {
      const store = useScheduleStore()
      store.assignments = [makeAssignment({ id: 'before', shift_id: 'sx', employee_id: 'ex' })]
      mockPost.mockRejectedValue(new Error('Network error'))
      await expect(store.assign('store1', 's1', 'e1')).rejects.toThrow()
      expect(store.assignments.find((a) => a.id === 'before')).toBeDefined()
      expect(store.assignments.find((a) => a.shift_id === 's1')).toBeUndefined()
    })

    it('triggers silent coverage refresh after successful assign', async () => {
      const store = useScheduleStore()
      mockPost.mockResolvedValue({ data: makeAssignment() })
      await store.assign('store1', 's1', 'e1')
      // Coverage refresh is triggered asynchronously via dynamic import.
      // Give the microtask queue a chance to flush.
      await new Promise((r) => setTimeout(r, 0))
      expect(mockFetchCoverage).toHaveBeenCalledWith('store1', true)
    })
  })

  describe('unassign', () => {
    it('removes assignment optimistically', async () => {
      const store = useScheduleStore()
      store.assignments = [makeAssignment({ id: 'a-to-remove' })]
      mockDelete.mockResolvedValue({})
      await store.unassign('store1', 'a-to-remove')
      expect(store.assignments.find((a) => a.id === 'a-to-remove')).toBeUndefined()
    })

    it('restores assignment on API error', async () => {
      const store = useScheduleStore()
      store.assignments = [makeAssignment({ id: 'a-to-restore' })]
      mockDelete.mockRejectedValue(new Error('Server error'))
      await expect(store.unassign('store1', 'a-to-restore')).rejects.toThrow()
      expect(store.assignments.find((a) => a.id === 'a-to-restore')).toBeDefined()
    })
  })

  describe('computed properties', () => {
    it('unassignedShifts excludes shifts with assignments', () => {
      const store = useScheduleStore()
      store.shifts      = [{ id: 's1' } as any, { id: 's2' } as any]
      store.assignments = [makeAssignment({ shift_id: 's1' })]
      expect(store.unassignedShifts).toHaveLength(1)
      expect(store.unassignedShifts[0].id).toBe('s2')
    })

    it('assignmentsByShift groups correctly', () => {
      const store = useScheduleStore()
      store.assignments = [
        makeAssignment({ id: 'a1', shift_id: 's1', employee_id: 'e1' }),
        makeAssignment({ id: 'a2', shift_id: 's1', employee_id: 'e2' }),
        makeAssignment({ id: 'a3', shift_id: 's2', employee_id: 'e1' }),
      ]
      expect(store.assignmentsByShift.get('s1')).toHaveLength(2)
      expect(store.assignmentsByShift.get('s2')).toHaveLength(1)
    })
  })
})

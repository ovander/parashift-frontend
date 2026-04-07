import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeaveStore } from '@/features/leave/stores/leaveStore'
import type { LeaveRequest, LeaveImpact, LeaveStatus } from '@/types'

function makeLeave(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id:          'l1',
    employee_id: 'e1',
    store_id:    'store1',
    type:        'vacation',  // ← matches backend json:"type"
    start_date:  '2026-04-01',
    end_date:    '2026-04-05',
    status:      'pending',   // ← lowercase, matching backend and LeaveStatus type
    created_at:  '',
    updated_at:  '',
    ...overrides,
  }
}

const { mockGet, mockPost, mockDelete, mockPatch, mockPut } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockDelete: vi.fn(),
  mockPatch:  vi.fn(),
  mockPut:    vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({
  default: { get: mockGet, post: mockPost, delete: mockDelete, patch: mockPatch, put: mockPut },
}))
vi.mock('@/stores/ui', () => ({ useUiStore: () => ({ showToast: vi.fn() }) }))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('leaveStore', () => {

  // ── fetchLeave ──────────────────────────────────────────────────────────────

  describe('fetchLeave', () => {
    it('loads leave requests into leaves ref', async () => {
      const store = useLeaveStore()
      mockGet.mockResolvedValue({ data: { data: [makeLeave()] } })
      await store.fetchLeave('store1')
      expect(store.leaves).toHaveLength(1)
    })

    it('sets loading=true during fetch and false after', async () => {
      const store = useLeaveStore()
      mockGet.mockResolvedValue({ data: { data: [] } })
      const p = store.fetchLeave('store1')
      expect(store.loading).toBe(true)
      await p
      expect(store.loading).toBe(false)
    })

    it('calls the correct API endpoint', async () => {
      const store = useLeaveStore()
      mockGet.mockResolvedValue({ data: { data: [] } })
      await store.fetchLeave('store-abc')
      expect(mockGet).toHaveBeenCalledWith('/api/v1/stores/store-abc/leave-requests')
    })

    it('handles missing data array gracefully (null response)', async () => {
      const store = useLeaveStore()
      mockGet.mockResolvedValue({ data: { data: null } })
      await store.fetchLeave('store1')
      expect(store.leaves).toEqual([])
    })
  })

  // ── createLeave ─────────────────────────────────────────────────────────────

  describe('createLeave', () => {
    it('appends the new request to leaves', async () => {
      const store = useLeaveStore()
      const newLeave = makeLeave({ id: 'l-new' })
      mockPost.mockResolvedValue({ data: newLeave })
      await store.createLeave('store1', { type: 'vacation', start_date: '2026-04-01', end_date: '2026-04-05' })
      expect(store.leaves.find((l) => l.id === 'l-new')).toBeDefined()
    })

    it('marks dirty state as clean after success', async () => {
      const store = useLeaveStore()
      mockPost.mockResolvedValue({ data: makeLeave({ id: 'l-new' }) })
      await store.createLeave('store1', { type: 'vacation', start_date: '2026-04-01', end_date: '2026-04-05' })
      expect(store.dirty.state).toBe('clean')
    })

    it('marks error on API failure and re-throws', async () => {
      const store = useLeaveStore()
      mockPost.mockRejectedValue({ message: 'Server error' })
      await expect(store.createLeave('store1', { type: 'sick', start_date: '2026-04-01', end_date: '2026-04-01' }))
        .rejects.toBeDefined()
      expect(store.dirty.state).toBe('error')
    })
  })

  // ── cancelLeave ─────────────────────────────────────────────────────────────

  describe('cancelLeave', () => {
    it('removes the cancelled leave from the list', async () => {
      const store = useLeaveStore()
      store.leaves = [makeLeave({ id: 'l1' }), makeLeave({ id: 'l2' })]
      mockDelete.mockResolvedValue({})
      await store.cancelLeave('store1', 'l1')
      expect(store.leaves.find((l) => l.id === 'l1')).toBeUndefined()
    })

    it('keeps other leaves intact after cancellation', async () => {
      const store = useLeaveStore()
      store.leaves = [makeLeave({ id: 'l1' }), makeLeave({ id: 'l2' })]
      mockDelete.mockResolvedValue({})
      await store.cancelLeave('store1', 'l1')
      expect(store.leaves.find((l) => l.id === 'l2')).toBeDefined()
    })
  })

  // ── approveLeave ────────────────────────────────────────────────────────────

  describe('approveLeave', () => {
    it('updates the leave status to approved in the list', async () => {
      const store = useLeaveStore()
      store.leaves = [makeLeave({ id: 'l1', status: 'pending' })]
      mockPut.mockResolvedValue({ data: makeLeave({ id: 'l1', status: 'approved' }) })
      await store.approveLeave('store1', 'l1')
      expect(store.leaves[0].status).toBe('approved')
    })

    it('calls the review endpoint with status=approved', async () => {
      const store = useLeaveStore()
      store.leaves = [makeLeave({ id: 'l1' })]
      mockPut.mockResolvedValue({ data: makeLeave({ id: 'l1', status: 'approved' }) })
      await store.approveLeave('store1', 'l1')
      expect(mockPut).toHaveBeenCalledWith(
        '/api/v1/stores/store1/leave-requests/l1/review',
        { status: 'approved' },
      )
    })
  })

  // ── rejectLeave ─────────────────────────────────────────────────────────────

  describe('rejectLeave', () => {
    it('updates the leave status to rejected in the list', async () => {
      const store = useLeaveStore()
      store.leaves = [makeLeave({ id: 'l1', status: 'pending' })]
      mockPut.mockResolvedValue({ data: makeLeave({ id: 'l1', status: 'rejected' }) })
      await store.rejectLeave('store1', 'l1')
      expect(store.leaves[0].status).toBe('rejected')
    })

    it('calls the review endpoint with status=rejected', async () => {
      const store = useLeaveStore()
      store.leaves = [makeLeave({ id: 'l1' })]
      mockPut.mockResolvedValue({ data: makeLeave({ id: 'l1', status: 'rejected' }) })
      await store.rejectLeave('store1', 'l1')
      expect(mockPut).toHaveBeenCalledWith(
        '/api/v1/stores/store1/leave-requests/l1/review',
        { status: 'rejected' },
      )
    })
  })

  // ── pendingLeave ────────────────────────────────────────────────────────────

  describe('pendingLeave', () => {
    it('returns only requests with status=pending (lowercase, matching backend)', () => {
      const store = useLeaveStore()
      store.leaves = [
        makeLeave({ id: 'l1', status: 'pending' }),
        makeLeave({ id: 'l2', status: 'approved' }),
        makeLeave({ id: 'l3', status: 'rejected' }),
        makeLeave({ id: 'l4', status: 'pending' }),
      ]
      expect(store.pendingLeave).toHaveLength(2)
      expect(store.pendingLeave.map((l) => l.id)).toEqual(['l1', 'l4'])
    })

    it('returns empty array when all requests are approved or rejected', () => {
      const store = useLeaveStore()
      store.leaves = [
        makeLeave({ id: 'l1', status: 'approved' }),
        makeLeave({ id: 'l2', status: 'rejected' }),
      ]
      expect(store.pendingLeave).toHaveLength(0)
    })

    it('returns empty array when leaves list is empty', () => {
      const store = useLeaveStore()
      expect(store.pendingLeave).toHaveLength(0)
    })

    it('does NOT match uppercase PENDING (regression guard)', () => {
      // The backend returns lowercase "pending". This test ensures the filter
      // never accidentally accepts uppercase variants.
      const store = useLeaveStore()
      // Force an incorrect casing as if a bug re-introduced uppercase
      store.leaves = [{ ...makeLeave({ id: 'l1' }), status: 'PENDING' as LeaveStatus }]
      expect(store.pendingLeave).toHaveLength(0)
    })
  })

  // ── fetchLeaveImpact ────────────────────────────────────────────────────────

  describe('fetchLeaveImpact', () => {
    function makeImpact(overrides: Partial<LeaveImpact> = {}): LeaveImpact {
      return {
        affected_shifts:     [],
        total_cancellations: 0,
        total_hours_lost:    0,
        uncovered_shifts:    0,
        ...overrides,
      }
    }

    it('calls the correct impact endpoint', async () => {
      const store = useLeaveStore()
      mockGet.mockResolvedValue({ data: makeImpact() })
      await store.fetchLeaveImpact('store1', 'leave-abc')
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/stores/store1/leave-requests/leave-abc/impact',
      )
    })

    it('returns the impact data from the response', async () => {
      const store = useLeaveStore()
      const impact = makeImpact({
        total_cancellations: 3,
        total_hours_lost:    24,
        uncovered_shifts:    1,
        affected_shifts: [
          { date: '2026-04-14', start_time: '09:00', end_time: '17:00', role: 'pharmacist', other_assigned: 0, will_need_cover: true },
        ],
      })
      mockGet.mockResolvedValue({ data: impact })
      const result = await store.fetchLeaveImpact('store1', 'leave-abc')
      expect(result.total_cancellations).toBe(3)
      expect(result.total_hours_lost).toBe(24)
      expect(result.uncovered_shifts).toBe(1)
      expect(result.affected_shifts).toHaveLength(1)
    })

    it('propagates API errors (does not swallow them)', async () => {
      const store = useLeaveStore()
      mockGet.mockRejectedValue({ response: { data: { message: 'Not found' } } })
      // Unlike approveLeave/rejectLeave, fetchLeaveImpact must throw so the
      // caller (LeaveApprovalView) can show the error in the dialog.
      await expect(store.fetchLeaveImpact('store1', 'leave-missing')).rejects.toBeDefined()
    })

    it('does NOT mutate the leaves array (read-only preview)', async () => {
      const store = useLeaveStore()
      store.leaves = [makeLeave({ id: 'l1', status: 'pending' })]
      mockGet.mockResolvedValue({ data: makeImpact({ total_cancellations: 2 }) })
      await store.fetchLeaveImpact('store1', 'l1')
      // Leaves list must be unchanged — this is a preview-only endpoint.
      expect(store.leaves).toHaveLength(1)
      expect(store.leaves[0].status).toBe('pending')
    })

    it('returns zero-impact correctly when employee has no shifts', async () => {
      const store = useLeaveStore()
      mockGet.mockResolvedValue({ data: makeImpact() })
      const result = await store.fetchLeaveImpact('store1', 'l1')
      expect(result.total_cancellations).toBe(0)
      expect(result.uncovered_shifts).toBe(0)
      expect(result.affected_shifts).toEqual([])
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import type { Employee } from '@/types'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id:                      'emp-1',
    store_id:                'store-1',
    name:                    'Alice Smith',
    position:                'employee',
    job_role:                'pharmacist',
    email:                   'alice@test.com',
    contract_hours_per_week: 35,
    created_at:              '2025-01-01T00:00:00Z',
    updated_at:              '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Mock useApi ───────────────────────────────────────────────────────────────

const { mockGet, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPatch:  vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({
  default: { get: mockGet, patch: mockPatch, delete: mockDelete },
}))
vi.mock('@/stores/ui', () => ({ useUiStore: () => ({ showToast: vi.fn() }) }))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('employeeStore', () => {

  // ── fetchEmployees ─────────────────────────────────────────────────────────
  describe('fetchEmployees', () => {
    it('loads employees from API', async () => {
      const store = useEmployeeStore()
      mockGet.mockResolvedValue({ data: { data: [makeEmployee()] } })
      await store.fetchEmployees('store-1')
      expect(store.employees).toHaveLength(1)
      expect(store.employees[0].name).toBe('Alice Smith')
    })

    it('sets loading state during fetch', async () => {
      const store = useEmployeeStore()
      let loadingDuringFetch = false
      mockGet.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return { data: { data: [] } }
      })
      await store.fetchEmployees('store-1')
      expect(loadingDuringFetch).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('deduplicates: second call with same storeId is a no-op', async () => {
      const store = useEmployeeStore()
      mockGet.mockResolvedValue({ data: { data: [makeEmployee()] } })
      await store.fetchEmployees('store-1')
      await store.fetchEmployees('store-1')   // second call — should skip
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('re-fetches when storeId changes', async () => {
      const store = useEmployeeStore()
      mockGet.mockResolvedValue({ data: { data: [] } })
      await store.fetchEmployees('store-1')
      await store.fetchEmployees('store-2')
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('re-fetches after invalidate()', async () => {
      const store = useEmployeeStore()
      mockGet.mockResolvedValue({ data: { data: [makeEmployee()] } })
      await store.fetchEmployees('store-1')
      store.invalidate()
      await store.fetchEmployees('store-1')
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('resets dedup guard on network error so next call retries', async () => {
      const store = useEmployeeStore()
      mockGet.mockRejectedValueOnce(new Error('network fail'))
      await store.fetchEmployees('store-1')
      mockGet.mockResolvedValue({ data: { data: [makeEmployee()] } })
      await store.fetchEmployees('store-1')
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })

  // ── invalidate ─────────────────────────────────────────────────────────────
  describe('invalidate', () => {
    it('clears employees array', async () => {
      const store = useEmployeeStore()
      mockGet.mockResolvedValue({ data: { data: [makeEmployee()] } })
      await store.fetchEmployees('store-1')
      store.invalidate()
      expect(store.employees).toHaveLength(0)
    })
  })

  // ── updateEmployee ─────────────────────────────────────────────────────────
  describe('updateEmployee', () => {
    it('patches the employee in the list', async () => {
      const store = useEmployeeStore()
      store.employees = [makeEmployee({ id: 'emp-1', name: 'Alice Smith' })]
      const updated = makeEmployee({ id: 'emp-1', name: 'Alice Jones' })
      mockPatch.mockResolvedValue({ data: updated })
      await store.updateEmployee('store-1', 'emp-1', { name: 'Alice Jones' })
      expect(store.employees[0].name).toBe('Alice Jones')
    })

    it('calls PATCH with the provided patch payload', async () => {
      const store = useEmployeeStore()
      store.employees = [makeEmployee({ id: 'emp-1' })]
      mockPatch.mockResolvedValue({ data: makeEmployee({ id: 'emp-1' }) })
      await store.updateEmployee('store-1', 'emp-1', { job_role: 'logistics_agent' })
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining('emp-1'),
        { job_role: 'logistics_agent' },
      )
    })
  })

  // ── removeEmployee ─────────────────────────────────────────────────────────
  describe('removeEmployee', () => {
    it('removes employee from list on success', async () => {
      const store = useEmployeeStore()
      store.employees = [makeEmployee({ id: 'emp-1' }), makeEmployee({ id: 'emp-2' })]
      mockDelete.mockResolvedValue({})
      await store.removeEmployee('store-1', 'emp-1')
      expect(store.employees.map((e) => e.id)).toEqual(['emp-2'])
    })

    it('optimistically removes then rolls back on API failure', async () => {
      const store = useEmployeeStore()
      store.employees = [makeEmployee({ id: 'emp-1' })]
      mockDelete.mockRejectedValue(new Error('server error'))
      await expect(store.removeEmployee('store-1', 'emp-1')).rejects.toThrow()
      expect(store.employees).toHaveLength(1)   // rolled back
    })
  })
})

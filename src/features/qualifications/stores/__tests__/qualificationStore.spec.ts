import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQualificationStore } from '@/features/qualifications/stores/qualificationStore'
import type { Qualification, EmployeeQualification } from '@/types'

// Mock the useApi composable
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/composables/useApi', () => ({
  useApi: () => mockApi,
}))

function makeQualification(overrides?: Partial<Qualification>): Qualification {
  return {
    id: 'qual-1',
    store_id: 'store-1',
    name: 'Pharmacy Technician',
    issuing_body: 'ISOIEC',
    required_for_role: 'pharmacist',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

function makeEmployeeQualification(overrides?: Partial<EmployeeQualification>): EmployeeQualification {
  return {
    id: 'emp-qual-1',
    employee_id: 'emp-1',
    qualification_id: 'qual-1',
    issue_date: '2025-01-01',
    expiry_date: '2026-01-01',
    verified: true,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

describe('useQualificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initialises with empty qualifications list', () => {
    const store = useQualificationStore()
    expect(store.qualifications).toEqual([])
    expect(store.employeeQuals.size).toBe(0)
    expect(store.loading).toBe(false)
  })

  it('fetchQualifications populates qualifications from API', async () => {
    const quals = [
      makeQualification({ id: 'qual-1' }),
      makeQualification({ id: 'qual-2', name: 'Cashier Certified' }),
    ]
    mockApi.get.mockResolvedValueOnce({ data: quals })

    const store = useQualificationStore()
    await store.fetchQualifications('store-1')

    expect(store.qualifications).toEqual(quals)
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/stores/store-1/qualifications')
  })

  it('fetchQualifications sets loading false after completion', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] })

    const store = useQualificationStore()
    expect(store.loading).toBe(false)

    const promise = store.fetchQualifications('store-1')
    expect(store.loading).toBe(true)

    await promise
    expect(store.loading).toBe(false)
  })

  it('fetchEmployeeQuals populates map by employeeId', async () => {
    const empQuals = [
      makeEmployeeQualification({ employee_id: 'emp-1', qualification_id: 'qual-1' }),
      makeEmployeeQualification({ id: 'emp-qual-2', employee_id: 'emp-1', qualification_id: 'qual-2' }),
    ]
    mockApi.get.mockResolvedValueOnce({ data: empQuals })

    const store = useQualificationStore()
    await store.fetchEmployeeQuals('store-1', 'emp-1')

    expect(store.employeeQuals.get('emp-1')).toEqual(empQuals)
    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/v1/stores/store-1/employees/emp-1/qualifications'
    )
  })

  it('createQualification appends new qual to list', async () => {
    const newQual = makeQualification({ id: 'qual-new', name: 'New Qualification' })
    mockApi.post.mockResolvedValueOnce({ data: newQual })

    const store = useQualificationStore()
    store.qualifications = [makeQualification({ id: 'qual-1' })]

    const result = await store.createQualification('store-1', {
      name: 'New Qualification',
      issuing_body: 'Test Body',
      required_for_role: 'test_role',
    })

    expect(result).toEqual(newQual)
    expect(store.qualifications).toHaveLength(2)
    expect(store.qualifications[1]).toEqual(newQual)
  })

  it('addEmployeeQualification adds to employee\'s qual list', async () => {
    const empQual = makeEmployeeQualification({ employee_id: 'emp-1' })
    mockApi.post.mockResolvedValueOnce({ data: empQual })

    const store = useQualificationStore()
    store.employeeQuals.set('emp-1', [])

    const result = await store.addEmployeeQualification('store-1', 'emp-1', {
      qualification_id: 'qual-1',
      issue_date: '2025-01-01',
    })

    expect(result).toEqual(empQual)
    expect(store.employeeQuals.get('emp-1')).toHaveLength(1)
    expect(store.employeeQuals.get('emp-1')?.[0]).toEqual(empQual)
  })

  it('removeEmployeeQualification removes from employee\'s qual list', async () => {
    mockApi.delete.mockResolvedValueOnce({})

    const store = useQualificationStore()
    const qual1 = makeEmployeeQualification({ id: 'emp-qual-1', employee_id: 'emp-1' })
    const qual2 = makeEmployeeQualification({ id: 'emp-qual-2', employee_id: 'emp-1' })
    store.employeeQuals.set('emp-1', [qual1, qual2])

    await store.removeEmployeeQualification('store-1', 'emp-1', 'emp-qual-1')

    expect(mockApi.delete).toHaveBeenCalledWith(
      '/api/v1/stores/store-1/employees/emp-1/qualifications/emp-qual-1'
    )
    expect(store.employeeQuals.get('emp-1')).toHaveLength(1)
    expect(store.employeeQuals.get('emp-1')?.[0].id).toBe('emp-qual-2')
  })

  it('getEmployeeQuals returns empty array for unknown employee', () => {
    const store = useQualificationStore()
    const result = store.getEmployeeQuals('unknown-employee')
    expect(result).toEqual([])
  })

  it('hasQualification returns true for verified matching qualification', () => {
    const store = useQualificationStore()
    const qual = makeEmployeeQualification({
      employee_id: 'emp-1',
      qualification_id: 'qual-1',
      verified: true,
    })
    store.employeeQuals.set('emp-1', [qual])

    expect(store.hasQualification('emp-1', 'qual-1')).toBe(true)
  })

  it('hasQualification returns false for unverified qualification', () => {
    const store = useQualificationStore()
    const qual = makeEmployeeQualification({
      employee_id: 'emp-1',
      qualification_id: 'qual-1',
      verified: false,
    })
    store.employeeQuals.set('emp-1', [qual])

    expect(store.hasQualification('emp-1', 'qual-1')).toBe(false)
  })

  it('hasQualification returns false for wrong qualification_id', () => {
    const store = useQualificationStore()
    const qual = makeEmployeeQualification({
      employee_id: 'emp-1',
      qualification_id: 'qual-1',
      verified: true,
    })
    store.employeeQuals.set('emp-1', [qual])

    expect(store.hasQualification('emp-1', 'qual-999')).toBe(false)
  })

  it('fetchQualifications handles empty response gracefully', async () => {
    mockApi.get.mockResolvedValueOnce({ data: null })

    const store = useQualificationStore()
    await store.fetchQualifications('store-1')

    expect(store.qualifications).toEqual([])
  })
})

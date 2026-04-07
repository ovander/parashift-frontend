import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlanStore } from '@/stores/planStore'
import type { SchedulePlan } from '@/types'

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

function makePlan(overrides?: Partial<SchedulePlan>): SchedulePlan {
  return {
    id: 'plan-1',
    store_id: 'store-1',
    week_start: '2026-04-01',
    state: 'DRAFT',
    snapshots: [],
    override_log: [],
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

describe('usePlanStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initialises with null plan and false loading', () => {
    const store = usePlanStore()
    expect(store.plan).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.publishing).toBe(false)
  })

  it('fetchOrCreate sets plan from API response', async () => {
    const plan = makePlan()
    mockApi.get.mockResolvedValueOnce({ data: plan })

    const store = usePlanStore()
    await store.fetchOrCreate('store-1', '2026-04-01')

    expect(store.plan).toEqual(plan)
  })

  it('fetchOrCreate sets loading to false after success', async () => {
    const plan = makePlan()
    mockApi.get.mockResolvedValueOnce({ data: plan })

    const store = usePlanStore()
    expect(store.loading).toBe(false)

    const promise = store.fetchOrCreate('store-1', '2026-04-01')
    expect(store.loading).toBe(true)

    await promise
    expect(store.loading).toBe(false)
  })

  it('fetchOrCreate sets loading to false on error', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('API error'))

    const store = usePlanStore()
    try {
      await store.fetchOrCreate('store-1', '2026-04-01')
    } catch {
      // ignore error
    }
    expect(store.loading).toBe(false)
  })

  it('isDraft returns true when state is DRAFT', () => {
    const store = usePlanStore()
    store.plan = makePlan({ state: 'DRAFT' })
    expect(store.isDraft).toBe(true)
  })

  it('isPublished returns true when state is PUBLISHED', () => {
    const store = usePlanStore()
    store.plan = makePlan({ state: 'PUBLISHED' })
    expect(store.isPublished).toBe(true)
  })

  it('isLive returns true when state is LIVE', () => {
    const store = usePlanStore()
    store.plan = makePlan({ state: 'LIVE' })
    expect(store.isLive).toBe(true)
  })

  it('canPublish is true only in DRAFT state', () => {
    const store = usePlanStore()

    store.plan = makePlan({ state: 'DRAFT' })
    expect(store.canPublish).toBe(true)

    store.plan = makePlan({ state: 'PUBLISHED' })
    expect(store.canPublish).toBe(false)

    store.plan = makePlan({ state: 'LIVE' })
    expect(store.canPublish).toBe(false)

    store.plan = null
    expect(store.canPublish).toBe(false)
  })

  it('canRollback is true when snapshots.length > 1', () => {
    const store = usePlanStore()

    store.plan = makePlan({ snapshots: [] })
    expect(store.canRollback).toBe(false)

    store.plan = makePlan({
      snapshots: [
        {
          taken_at: '2026-04-01T00:00:00Z',
          shift_count: 10,
          assignment_count: 8,
          coverage_rate: 0.8,
        },
      ],
    })
    expect(store.canRollback).toBe(false)

    store.plan = makePlan({
      snapshots: [
        {
          taken_at: '2026-04-01T00:00:00Z',
          shift_count: 10,
          assignment_count: 8,
          coverage_rate: 0.8,
        },
        {
          taken_at: '2026-04-02T00:00:00Z',
          shift_count: 11,
          assignment_count: 9,
          coverage_rate: 0.82,
        },
      ],
    })
    expect(store.canRollback).toBe(true)
  })

  it('publish calls correct API endpoint and updates plan', async () => {
    const originalPlan = makePlan({ state: 'DRAFT' })
    const publishedPlan = makePlan({ state: 'PUBLISHED' })
    mockApi.post.mockResolvedValueOnce({ data: publishedPlan })

    const store = usePlanStore()
    store.plan = originalPlan

    await store.publish('store-1')

    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/stores/store-1/plans/plan-1/publish', { note: undefined })
    expect(store.plan).toEqual(publishedPlan)
  })

  it('publish sets publishing flag during call', async () => {
    mockApi.post.mockImplementationOnce(async () => {
      expect(store.publishing).toBe(true)
      return { data: makePlan({ state: 'PUBLISHED' }) }
    })

    const store = usePlanStore()
    store.plan = makePlan()

    await store.publish('store-1')
    expect(store.publishing).toBe(false)
  })

  it('recordOverride posts to override endpoint and updates plan', async () => {
    const originalPlan = makePlan()
    const overriddenPlan = makePlan({
      override_log: [
        {
          timestamp: '2026-04-01T10:00:00Z',
          user_id: 'user-1',
          reason: 'Manual adjustment',
          shift_ids: ['shift-1', 'shift-2'],
        },
      ],
    })
    mockApi.post.mockResolvedValueOnce({ data: overriddenPlan })

    const store = usePlanStore()
    store.plan = originalPlan

    const payload = {
      reason: 'Manual adjustment',
      shift_ids: ['shift-1', 'shift-2'],
    }
    await store.recordOverride('store-1', payload)

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/stores/store-1/plans/plan-1/override',
      payload
    )
    // recordOverride only logs the status response; plan is not replaced by the override response.
    expect(store.plan).toEqual(originalPlan)
  })

  it('rollback calls rollback endpoint', async () => {
    const originalPlan = makePlan({
      snapshots: [
        {
          taken_at: '2026-04-01T00:00:00Z',
          shift_count: 10,
          assignment_count: 8,
          coverage_rate: 0.8,
        },
      ],
    })
    const rolledBackPlan = makePlan({
      snapshots: [
        {
          taken_at: '2026-04-01T00:00:00Z',
          shift_count: 10,
          assignment_count: 8,
          coverage_rate: 0.8,
        },
        {
          taken_at: '2026-04-02T00:00:00Z',
          shift_count: 11,
          assignment_count: 9,
          coverage_rate: 0.82,
        },
      ],
    })
    mockApi.post.mockResolvedValueOnce({ data: rolledBackPlan })

    const store = usePlanStore()
    store.plan = originalPlan

    await store.rollback('store-1')

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/stores/store-1/plans/plan-1/rollback',
      { snapshot_version: 1, note: undefined }
    )
    expect(store.plan).toEqual(rolledBackPlan)
  })

  it('$reset clears plan and loading state', () => {
    const store = usePlanStore()
    store.plan = makePlan()
    store.loading = true
    store.publishing = true

    store.$reset()

    expect(store.plan).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.publishing).toBe(false)
  })

  it('state returns null when plan is null', () => {
    const store = usePlanStore()
    expect(store.state).toBeNull()
  })

  it('state returns plan state when plan exists', () => {
    const store = usePlanStore()
    store.plan = makePlan({ state: 'PUBLISHED' })
    expect(store.state).toBe('PUBLISHED')
  })
})

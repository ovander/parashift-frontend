import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCoverageStore } from '@/features/coverage/stores/coverageStore'
import type { CoverageReport } from '@/types'

const { mockGet, mockSetLoading } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSetLoading: vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({ default: { get: mockGet } }))
vi.mock('@/stores/ui', () => ({
  useUiStore: () => ({ showToast: vi.fn(), setLoading: mockSetLoading }),
}))
vi.mock('@/stores/storeContext', () => ({
  useStoreContext: () => ({ weekStart: '2026-03-30' }),
}))

const mockReport: CoverageReport = {
  items: [
    {
      date:           '2026-03-30',
      start_time:     '09:00',
      end_time:       '17:00',
      required_count: 2,
      assigned_count: 2,
      status:         'OK',
      missing_role:   false,
    },
  ],
  total_slots: 1,
  gap_count:   0,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('coverageStore', () => {
  it('populates coverage from API response', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    await store.fetchCoverage('store1')
    expect(store.coverage).toEqual(mockReport)
  })

  it('sets loading=true during fetch and false after', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    const p = store.fetchCoverage('store1')
    expect(store.loading).toBe(true)
    await p
    expect(store.loading).toBe(false)
  })

  describe('silent mode', () => {
    it('does not call uiStore.setLoading when silent=true', async () => {
      const store = useCoverageStore()
      mockGet.mockResolvedValue({ data: mockReport })
      await store.fetchCoverage('store1', true)
      expect(mockSetLoading).not.toHaveBeenCalled()
    })

    it('calls uiStore.setLoading when silent=false (default)', async () => {
      const store = useCoverageStore()
      mockGet.mockResolvedValue({ data: mockReport })
      await store.fetchCoverage('store1', false)
      expect(mockSetLoading).toHaveBeenCalledWith(true, expect.any(String))
      expect(mockSetLoading).toHaveBeenCalledWith(false)
    })
  })

  it('hasGaps returns false when gap_count=0', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: { ...mockReport, gap_count: 0 } })
    await store.fetchCoverage('store1')
    expect(store.hasGaps()).toBe(false)
  })

  it('hasGaps returns true when gap_count>0', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: { ...mockReport, gap_count: 3 } })
    await store.fetchCoverage('store1')
    expect(store.hasGaps()).toBe(true)
  })

  it('hasGaps returns false when no coverage loaded', () => {
    const store = useCoverageStore()
    expect(store.hasGaps()).toBe(false)
  })

  it('items() returns empty array when no coverage loaded', () => {
    const store = useCoverageStore()
    expect(store.items()).toEqual([])
  })

  it('items() returns the items array from the report', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    await store.fetchCoverage('store1')
    expect(store.items()).toEqual(mockReport.items)
  })

  it('builds correct API URL from weekStart', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    await store.fetchCoverage('store-abc')
    // weekStart = '2026-03-30', to = addDays('2026-03-30', 6) = '2026-04-05'
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/stores/store-abc/coverage?from=2026-03-30&to=2026-04-05',
    )
  })

  it('accepts an explicit weekStart override', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    await store.fetchCoverage('store-abc', false, '2026-04-06')
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/stores/store-abc/coverage?from=2026-04-06&to=2026-04-12',
    )
  })
})

// ─── fetchMonthCoverage ───────────────────────────────────────────────────────

describe('fetchMonthCoverage', () => {
  it('fetches with explicit from/to params', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    await store.fetchMonthCoverage('store-abc', '2026-03-30', '2026-05-10')
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/stores/store-abc/coverage?from=2026-03-30&to=2026-05-10',
    )
  })

  it('populates monthCoverage from API response', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    await store.fetchMonthCoverage('store-abc', '2026-03-30', '2026-05-10')
    expect(store.monthCoverage).toEqual(mockReport)
  })

  it('does not mutate the week coverage ref', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    // Load a week report first
    await store.fetchCoverage('store-abc')
    const weekSnap = store.coverage
    // Now load a month report
    await store.fetchMonthCoverage('store-abc', '2026-03-30', '2026-05-10')
    // Week ref must be untouched
    expect(store.coverage).toBe(weekSnap)
  })

  it('sets monthLoading=true during fetch and false after', async () => {
    const store = useCoverageStore()
    mockGet.mockResolvedValue({ data: mockReport })
    const p = store.fetchMonthCoverage('store-abc', '2026-03-30', '2026-05-10')
    expect(store.monthLoading).toBe(true)
    await p
    expect(store.monthLoading).toBe(false)
  })

  it('sets monthLoading=false even when API throws', async () => {
    const store = useCoverageStore()
    mockGet.mockRejectedValue(new Error('network error'))
    await store.fetchMonthCoverage('store-abc', '2026-03-30', '2026-05-10')
    expect(store.monthLoading).toBe(false)
  })

  it('leaves monthCoverage null when API throws', async () => {
    const store = useCoverageStore()
    mockGet.mockRejectedValue(new Error('network error'))
    await store.fetchMonthCoverage('store-abc', '2026-03-30', '2026-05-10')
    expect(store.monthCoverage).toBeNull()
  })

  it('monthCoverage starts as null before any fetch', () => {
    const store = useCoverageStore()
    expect(store.monthCoverage).toBeNull()
    expect(store.monthLoading).toBe(false)
  })
})

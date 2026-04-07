import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

// ── Hoist mocks BEFORE imports ────────────────────────────────────────────────
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ get: mockGet }),
  default: { get: mockGet },
}))

// ── Import AFTER mocks are registered ────────────────────────────────────────
import { usePublicHolidays } from '@/features/schedule/composables/usePublicHolidays'

const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "Jour de l'An",      zone: 'metropole' },
  { date: '2026-04-06', name: 'Lundi de Pâques',   zone: 'metropole' },
  { date: '2026-05-01', name: 'Fête du Travail',   zone: 'metropole' },
]

describe('usePublicHolidays', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('fetches holidays for the given year on mount', async () => {
    mockGet.mockResolvedValue({ data: HOLIDAYS_2026 })

    const weekStart = ref('2026-04-06')
    const { holidays } = usePublicHolidays(weekStart)

    await nextTick()
    await nextTick() // allow the async load to settle

    expect(mockGet).toHaveBeenCalledWith('/api/v1/public-holidays', { params: { year: 2026 } })
    expect(holidays.value).toHaveLength(3)
    expect(holidays.value[1].name).toBe('Lundi de Pâques')
  })

  it('caches results — same year does not trigger a second API call', async () => {
    mockGet.mockResolvedValue({ data: HOLIDAYS_2026 })

    const weekStart = ref('2026-04-06')
    const { holidays } = usePublicHolidays(weekStart)

    await nextTick()
    await nextTick()

    // Navigate to a different week in the same year.
    weekStart.value = '2026-06-01'
    await nextTick()
    await nextTick()

    expect(mockGet).toHaveBeenCalledTimes(1) // cached — no second call
    expect(holidays.value).toHaveLength(3)
  })

  it('fetches both years when a week straddles a year boundary', async () => {
    const holidays2026 = [{ date: '2026-12-25', name: 'Noël',        zone: 'metropole' }]
    const holidays2027 = [{ date: '2027-01-01', name: "Jour de l'An", zone: 'metropole' }]

    mockGet
      .mockResolvedValueOnce({ data: holidays2026 })
      .mockResolvedValueOnce({ data: holidays2027 })

    // Mon 28 Dec 2026 → Sun 3 Jan 2027 straddles the year boundary.
    const weekStart = ref('2026-12-28')
    const { holidays } = usePublicHolidays(weekStart)

    // Two concurrent fetchYear() calls → Promise.all needs one extra microtask
    // flush beyond what two nextTick() calls guarantee; flushPromises drains all.
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/public-holidays', { params: { year: 2026 } })
    expect(mockGet).toHaveBeenCalledWith('/api/v1/public-holidays', { params: { year: 2027 } })
    expect(holidays.value).toHaveLength(2)
  })

  it('returns empty array and does not throw on API error', async () => {
    mockGet.mockRejectedValue(new Error('network error'))

    const weekStart = ref('2026-04-06')
    const { holidays } = usePublicHolidays(weekStart)

    await nextTick()
    await nextTick()

    // No throw — holidays gracefully degrades to empty.
    expect(holidays.value).toEqual([])
  })

  it('re-fetches when weekStart changes to a different year', async () => {
    mockGet
      .mockResolvedValueOnce({ data: HOLIDAYS_2026 })
      .mockResolvedValueOnce({ data: [{ date: '2027-01-01', name: "Jour de l'An", zone: 'metropole' }] })

    const weekStart = ref('2026-04-06')
    const { holidays } = usePublicHolidays(weekStart)

    await nextTick()
    await nextTick()
    expect(holidays.value).toHaveLength(3)

    weekStart.value = '2027-03-01'
    await nextTick()
    await nextTick()

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(holidays.value).toHaveLength(1)
    expect(holidays.value[0].name).toBe("Jour de l'An")
  })
})

import { ref, watch, type Ref } from 'vue'
import { useApi } from '@/composables/useApi'

export interface PublicHoliday {
  date: string // YYYY-MM-DD
  name: string
  zone: string
}

// Module-level singletons — shared across all component instances so that
// TodayView, WeekStrip, etc. never fire duplicate requests for the same year.
const _cache    = new Map<number, PublicHoliday[]>()
const _inflight = new Map<number, Promise<PublicHoliday[]>>()

/**
 * Clears the in-memory holiday cache and any in-flight de-duplication state.
 * Intended for use in unit tests only (call in `beforeEach` to isolate tests).
 */
export function clearHolidayCache(): void {
  _cache.clear()
  _inflight.clear()
}

/**
 * Fetches public holidays for the years visible in the current planner week.
 * Re-fetches automatically when weekStart changes year.
 * Results are cached by year so navigation within the same year is instant.
 * In-flight deduplication ensures only one HTTP request per year at a time,
 * even when multiple components mount simultaneously.
 */
export function usePublicHolidays(weekStart: Ref<string>) {
  const api      = useApi()
  const holidays = ref<PublicHoliday[]>([])

  async function fetchYear(year: number): Promise<PublicHoliday[]> {
    if (_cache.has(year))    return _cache.get(year)!
    if (_inflight.has(year)) return _inflight.get(year)!

    const promise = api
      .get<PublicHoliday[]>('/api/v1/public-holidays', { params: { year } })
      .then((res) => {
        const data = res.data ?? []
        _cache.set(year, data)
        return data
      })
      .catch(() => {
        // Non-fatal: if the backend can't fetch from the gov API we still display the planner.
        // Don't cache the failure so a page reload can retry.
        return [] as PublicHoliday[]
      })
      .finally(() => {
        _inflight.delete(year)
      })

    _inflight.set(year, promise)
    return promise
  }

  async function load() {
    const date      = new Date(weekStart.value)
    const startYear = date.getFullYear()
    // The week can straddle a year boundary (e.g. Mon 30 Dec → Sun 5 Jan)
    const endDate   = new Date(date)
    endDate.setDate(endDate.getDate() + 6)
    const endYear   = endDate.getFullYear()

    if (startYear === endYear) {
      holidays.value = await fetchYear(startYear)
    } else {
      const [a, b]   = await Promise.all([fetchYear(startYear), fetchYear(endYear)])
      holidays.value = [...a, ...b]
    }
  }

  watch(weekStart, load, { immediate: true })

  return { holidays }
}

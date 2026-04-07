import { ref, watch, type Ref } from 'vue'
import { useApi } from '@/composables/useApi'

export interface PublicHoliday {
  date: string // YYYY-MM-DD
  name: string
  zone: string
}

/**
 * Fetches public holidays for the years visible in the current planner week.
 * Re-fetches automatically when weekStart changes year.
 * Results are cached by year so navigation within the same year is instant.
 */
export function usePublicHolidays(weekStart: Ref<string>) {
  const api      = useApi()
  const holidays = ref<PublicHoliday[]>([])
  const cache    = new Map<number, PublicHoliday[]>()

  async function fetchYear(year: number): Promise<PublicHoliday[]> {
    if (cache.has(year)) return cache.get(year)!
    try {
      const res  = await api.get<PublicHoliday[]>('/api/v1/public-holidays', { params: { year } })
      const data = res.data ?? []
      cache.set(year, data)
      return data
    } catch {
      // Non-fatal: if the backend can't fetch from the gov API we still display the planner
      return []
    }
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

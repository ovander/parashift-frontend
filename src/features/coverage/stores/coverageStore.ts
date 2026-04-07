import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'
import { useStoreContext } from '@/stores/storeContext'
import { extractApiError, createDevlog } from '@/utils/logger'
import { addDays } from '@/utils/dateUtils'

const log = createDevlog('CoverageStore')
import type { CoverageReport } from '@/types'

export const useCoverageStore = defineStore('coverage', () => {
  const coverage      = ref<CoverageReport | null>(null)
  const monthCoverage = ref<CoverageReport | null>(null)
  const loading       = ref(false)
  const monthLoading  = ref(false)

  async function _fetch(storeId: string, from: string, to: string, silent: boolean, target: typeof coverage) {
    log.info('fetchCoverage →', { storeId, from, to, silent })
    if (!silent) { loading.value = true; useUiStore().setLoading(true, 'Loading coverage…') }
    try {
      const res = await api.get<CoverageReport>(`/api/v1/stores/${storeId}/coverage?from=${from}&to=${to}`)
      target.value = res.data
      log.info('fetchCoverage ←', { gap_count: res.data?.gap_count ?? 0, total_slots: res.data?.total_slots ?? 0 })
    } catch (err) {
      log.error('fetchCoverage failed', err)
      if (!silent) useUiStore().showToast('error', 'Coverage failed', extractApiError(err))
    } finally {
      if (!silent) { loading.value = false; useUiStore().setLoading(false) }
    }
  }

  // weekStart is optional; falls back to the storeContext's current week.
  async function fetchCoverage(storeId: string, silent = false, weekStart?: string) {
    const from = weekStart ?? useStoreContext().weekStart
    const to   = addDays(from, 6)
    await _fetch(storeId, from, to, silent, coverage)
  }

  /** Fetch coverage for an explicit date range — used by the month calendar view. */
  async function fetchMonthCoverage(storeId: string, from: string, to: string) {
    monthLoading.value = true
    try {
      const res = await api.get<CoverageReport>(`/api/v1/stores/${storeId}/coverage?from=${from}&to=${to}`)
      monthCoverage.value = res.data
      log.info('fetchMonthCoverage ←', { from, to, gap_count: res.data?.gap_count ?? 0 })
    } catch (err) {
      log.error('fetchMonthCoverage failed', err)
      useUiStore().showToast('error', 'Coverage failed', extractApiError(err))
    } finally {
      monthLoading.value = false
    }
  }

  const hasGaps = () => (coverage.value?.gap_count ?? 0) > 0

  /** Null-safe items accessor — Go serializes nil slices as JSON null. */
  const items = () => coverage.value?.items ?? []

  return { coverage, monthCoverage, loading, monthLoading, fetchCoverage, fetchMonthCoverage, hasGaps, items }
})

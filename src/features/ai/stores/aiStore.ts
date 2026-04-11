import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAIApi } from '@/composables/useApi'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useCoverageStore } from '@/features/coverage/stores/coverageStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { extractApiError } from '@/utils/logger'
import { fmtLocal } from '@/utils/dateUtils'
import type { ScheduleSuggestion, OptimizeSuggestion, AIInsight } from '@/types'

export const useAIStore = defineStore('ai', () => {
  const suggestions   = ref<ScheduleSuggestion[]>([])
  const optimizations = ref<OptimizeSuggestion[]>([])
  const insights      = ref<AIInsight[]>([])

  const loadingSuggest   = ref(false)
  const loadingOptimize  = ref(false)
  const loadingInsights  = ref(false)

  const errorSuggest   = ref('')
  const errorOptimize  = ref('')
  const errorInsights  = ref('')

  function buildBaseContext(storeId: string) {
    const sched    = useScheduleStore()
    const coverage = useCoverageStore()
    const employees = useEmployeeStore()
    return {
      store_id:       storeId,
      shift_count:    sched.shifts.length,
      assigned_count: sched.assignments.length,
      employee_count: employees.employees.length,
      coverage_gaps:  coverage.coverage?.gap_count ?? 0,
    }
  }

  async function fetchSuggestions(storeId: string, shiftId: string) {
    loadingSuggest.value = true
    errorSuggest.value   = ''
    suggestions.value    = []
    try {
      // Pre-warm data
      await Promise.allSettled([
        useEmployeeStore().fetchEmployees(storeId),
        useScheduleStore().fetchWeek(storeId, useScheduleStore().shifts[0]?.date ?? fmtLocal(new Date()), true),
      ])
      const api = useAIApi()
      const res = await api.get<{ data: ScheduleSuggestion[] }>(
        `/api/v1/stores/${storeId}/ai/suggest-assignment?shift_id=${shiftId}`,
        { params: { context: JSON.stringify(buildBaseContext(storeId)) } },
      )
      suggestions.value = res.data.data ?? []
    } catch (err) {
      errorSuggest.value = extractApiError(err)
    } finally {
      loadingSuggest.value = false
    }
  }

  async function fetchOptimizations(storeId: string, weekStart: string, weekEnd: string) {
    loadingOptimize.value = true
    errorOptimize.value   = ''
    optimizations.value   = []
    try {
      const api = useAIApi()
      const res = await api.post<{ data: OptimizeSuggestion[] }>(
        `/api/v1/stores/${storeId}/ai/optimize-schedule`,
        { week_start: weekStart, week_end: weekEnd, context: buildBaseContext(storeId) },
      )
      optimizations.value = res.data.data ?? []
    } catch (err) {
      errorOptimize.value = extractApiError(err)
    } finally {
      loadingOptimize.value = false
    }
  }

  async function fetchInsights(storeId: string) {
    loadingInsights.value = true
    errorInsights.value   = ''
    try {
      const api = useAIApi()
      const res = await api.get<{ data: AIInsight[] }>(`/api/v1/stores/${storeId}/ai/insights`)
      insights.value = res.data.data ?? []
    } catch (err) {
      errorInsights.value = extractApiError(err)
    } finally {
      loadingInsights.value = false
    }
  }

  async function dismissInsight(storeId: string, insightId: string) {
    try {
      await useAIApi().delete(`/api/v1/stores/${storeId}/ai/insights/${insightId}`)
      insights.value = insights.value.filter((i) => i.id !== insightId)
    } catch { /* silent */ }
  }

  return {
    suggestions, optimizations, insights,
    loadingSuggest, loadingOptimize, loadingInsights,
    errorSuggest, errorOptimize, errorInsights,
    fetchSuggestions, fetchOptimizations, fetchInsights, dismissInsight,
  }
})

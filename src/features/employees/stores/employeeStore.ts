import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'
import { extractApiError } from '@/utils/logger'
import type { Employee } from '@/types'

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref<Employee[]>([])
  const loading   = ref(false)

  // ── Deduplication guard ──────────────────────────────────────────────────
  // Prevents parallel GET /employees when multiple components mount at once.
  let lastFetchedStoreId: string | null = null

  async function fetchEmployees(storeId: string) {
    if (employees.value.length > 0 && lastFetchedStoreId === storeId) return
    lastFetchedStoreId = storeId
    loading.value = true
    try {
      const res       = await api.get<{ data: Employee[] }>(`/api/v1/stores/${storeId}/employees`)
      employees.value = res.data.data ?? []
    } catch (err) {
      lastFetchedStoreId = null   // allow retry on next call
      useUiStore().showToast('error', 'Failed to load employees', extractApiError(err))
    } finally {
      loading.value = false
    }
  }

  /**
   * Bust the dedup cache so the next `fetchEmployees` call re-fetches.
   * Call this after any add / edit / remove mutation.
   */
  function invalidate() {
    lastFetchedStoreId = null
    employees.value    = []
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  async function updateEmployee(
    storeId: string,
    id: string,
    patch: Partial<Pick<Employee, 'name' | 'email' | 'job_role' | 'contract_hours_per_week' | 'position'>>,
  ): Promise<Employee> {
    const res     = await api.patch<Employee>(`/api/v1/stores/${storeId}/employees/${id}`, patch)
    const updated = res.data
    const idx     = employees.value.findIndex((e) => e.id === id)
    if (idx !== -1) employees.value[idx] = updated
    return updated
  }

  async function removeEmployee(storeId: string, id: string): Promise<void> {
    const prev      = [...employees.value]
    employees.value = employees.value.filter((e) => e.id !== id)   // optimistic
    try {
      await api.delete(`/api/v1/stores/${storeId}/employees/${id}`)
    } catch (err) {
      employees.value = prev                                         // roll back
      useUiStore().showToast('error', 'Failed to remove employee', extractApiError(err))
      throw err
    }
  }

  return { employees, loading, fetchEmployees, invalidate, updateEmployee, removeEmployee }
})

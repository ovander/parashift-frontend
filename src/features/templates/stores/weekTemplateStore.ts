import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import { createDevlog, extractApiError } from '@/utils/logger'
import { useUiStore } from '@/stores/ui'

const log = createDevlog('WeekTemplateStore')

// Go day-of-week convention: 0=Sunday, 1=Monday … 6=Saturday
export interface WeekTemplateEntry {
  week_type:   'A' | 'B'
  day_of_week: number   // 0=Sun … 6=Sat
  start_time:  string   // HH:MM
  end_time:    string   // HH:MM
  role:        string   // job role for the slot (e.g. pharmacist_assistant); '' = any
}

interface WeekTemplateResponse {
  employee_id: string
  week_type:   string
  entries:     WeekTemplateEntry[]
}

export const useWeekTemplateStore = defineStore('weekTemplate', () => {
  // Keyed by employeeId — lazily populated on first fetch
  const entriesByEmployee = ref<Record<string, WeekTemplateEntry[]>>({})
  const loading = ref(false)
  const saving  = ref(false)

  async function fetchTemplates(storeId: string, employeeId: string) {
    loading.value = true
    try {
      const res = await api.get<WeekTemplateResponse>(
        `/api/v1/stores/${storeId}/employees/${employeeId}/week-templates`,
      )
      const entries = res.data.entries ?? []
      entriesByEmployee.value = { ...entriesByEmployee.value, [employeeId]: entries }
      log.info('fetchTemplates ←', { employeeId, count: entries.length })
    } catch (err) {
      log.error('fetchTemplates failed', { employeeId, detail: extractApiError(err) })
    } finally {
      loading.value = false
    }
  }

  function getEntries(employeeId: string): WeekTemplateEntry[] {
    return entriesByEmployee.value[employeeId] ?? []
  }

  async function saveTemplates(storeId: string, employeeId: string, entries: WeekTemplateEntry[]) {
    saving.value = true
    log.info('saveTemplates →', { employeeId, count: entries.length })
    try {
      await api.put(
        `/api/v1/stores/${storeId}/employees/${employeeId}/week-templates`,
        { employee_id: employeeId, templates: entries },
      )
      entriesByEmployee.value = { ...entriesByEmployee.value, [employeeId]: entries }
      log.info('saveTemplates ← ok', { employeeId })
      useUiStore().showToast('success', 'Planning saved', 'A/B rotation template updated')
    } catch (err: any) {
      log.error('saveTemplates failed', {
        employeeId,
        status: err?.response?.status,
        detail: err?.response?.data?.error ?? err?.message,
      })
      useUiStore().showToast('error', 'Save failed', extractApiError(err))
      throw err
    } finally {
      saving.value = false
    }
  }

  return { loading, saving, fetchTemplates, getEntries, saveTemplates }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'
import { createDevlog, extractApiError } from '@/utils/logger'

const log = createDevlog('StoreConfigStore')

export interface OpeningHourSlot {
  day_of_week: number // 0=Sun, 1=Mon … 6=Sat
  open_time:   string // HH:MM
  close_time:  string // HH:MM
}

export interface CoverageRequirement {
  id:            string
  day_of_week:   number
  start_time:    string
  end_time:      string
  min_staff:     number
  required_role: string
}

export interface StoreException {
  id:   string
  date: string // YYYY-MM-DD
  type: 'EXTRA_OPEN' | 'FORCED_CLOSED'
  note: string
}

export const useStoreConfigStore = defineStore('storeConfig', () => {
  const ui = useUiStore()

  // ── Opening hours ──────────────────────────────────────────────────
  const openingHours  = ref<OpeningHourSlot[]>([])
  const loadingHours  = ref(false)
  const savingHours   = ref(false)

  async function fetchOpeningHours() {
    loadingHours.value = true
    try {
      const res = await api.get<{ opening_hours: OpeningHourSlot[] }>('/api/v1/stores/me')
      openingHours.value = res.data.opening_hours ?? []
      log.info('fetchOpeningHours ←', { count: openingHours.value.length })
    } catch (err) {
      log.error('fetchOpeningHours failed', extractApiError(err))
    } finally {
      loadingHours.value = false
    }
  }

  async function saveOpeningHours(slots: OpeningHourSlot[]) {
    savingHours.value = true
    try {
      await api.put('/api/v1/stores/me', { opening_hours: slots })
      openingHours.value = slots
      log.info('saveOpeningHours ✓', { count: slots.length })
      ui.showToast('success', 'Saved', 'Opening hours updated')
    } catch (err) {
      log.error('saveOpeningHours failed', extractApiError(err))
      ui.showToast('error', 'Error', extractApiError(err))
    } finally {
      savingHours.value = false
    }
  }

  // ── Coverage requirements ──────────────────────────────────────────
  const requirements       = ref<CoverageRequirement[]>([])
  const loadingRequirements = ref(false)
  const savingRequirement   = ref(false)

  async function fetchRequirements(storeId: string) {
    loadingRequirements.value = true
    try {
      const res = await api.get<CoverageRequirement[]>(`/api/v1/stores/${storeId}/coverage-requirements`)
      requirements.value = res.data ?? []
      log.info('fetchRequirements ←', { count: requirements.value.length })
    } catch (err) {
      log.error('fetchRequirements failed', extractApiError(err))
    } finally {
      loadingRequirements.value = false
    }
  }

  async function createRequirement(storeId: string, req: Omit<CoverageRequirement, 'id'>) {
    savingRequirement.value = true
    try {
      const res = await api.post<CoverageRequirement>(`/api/v1/stores/${storeId}/coverage-requirements`, req)
      requirements.value.push(res.data)
      log.info('createRequirement ✓', res.data.id)
      ui.showToast('success', 'Added', 'Coverage requirement added')
      return res.data
    } catch (err) {
      log.error('createRequirement failed', extractApiError(err))
      ui.showToast('error', 'Error', extractApiError(err))
    } finally {
      savingRequirement.value = false
    }
  }

  async function updateRequirement(storeId: string, id: string, req: Omit<CoverageRequirement, 'id'>) {
    savingRequirement.value = true
    try {
      const res = await api.put<CoverageRequirement>(`/api/v1/stores/${storeId}/coverage-requirements/${id}`, req)
      const idx = requirements.value.findIndex(r => r.id === id)
      if (idx !== -1) requirements.value[idx] = res.data
      log.info('updateRequirement ✓', id)
      ui.showToast('success', 'Saved', 'Requirement updated')
      return res.data
    } catch (err) {
      log.error('updateRequirement failed', extractApiError(err))
      ui.showToast('error', 'Error', extractApiError(err))
    } finally {
      savingRequirement.value = false
    }
  }

  async function deleteRequirement(storeId: string, id: string) {
    try {
      await api.delete(`/api/v1/stores/${storeId}/coverage-requirements/${id}`)
      requirements.value = requirements.value.filter(r => r.id !== id)
      log.info('deleteRequirement ✓', id)
      ui.showToast('success', 'Deleted', 'Requirement removed')
    } catch (err) {
      log.error('deleteRequirement failed', extractApiError(err))
      ui.showToast('error', 'Error', extractApiError(err))
    }
  }

  // ── Store exceptions ──────────────────────────────────────────────────
  const exceptions         = ref<StoreException[]>([])
  const loadingExceptions  = ref(false)
  const savingException    = ref(false)

  /** Fetch all exceptions within [from, to]. Pass a wide range for the config page. */
  async function fetchExceptions(storeId: string, from: string, to: string) {
    loadingExceptions.value = true
    try {
      const res = await api.get<StoreException[]>(
        `/api/v1/stores/${storeId}/exceptions?from=${from}&to=${to}`,
      )
      exceptions.value = res.data ?? []
      log.info('fetchExceptions ←', { count: exceptions.value.length })
    } catch (err) {
      log.error('fetchExceptions failed', extractApiError(err))
    } finally {
      loadingExceptions.value = false
    }
  }

  async function createException(
    storeId: string,
    req: { date: string; type: 'EXTRA_OPEN' | 'FORCED_CLOSED'; note: string },
  ) {
    savingException.value = true
    try {
      const res = await api.post<StoreException>(
        `/api/v1/stores/${storeId}/exceptions`,
        req,
      )
      exceptions.value = [...exceptions.value, res.data].sort((a, b) =>
        a.date.localeCompare(b.date),
      )
      log.info('createException ✓', res.data.id)
      ui.showToast('success', 'Exception ajoutée', res.data.date)
      return res.data
    } catch (err) {
      log.error('createException failed', extractApiError(err))
      ui.showToast('error', 'Erreur', extractApiError(err))
    } finally {
      savingException.value = false
    }
  }

  async function deleteException(storeId: string, id: string) {
    const prev = [...exceptions.value]
    exceptions.value = exceptions.value.filter((e) => e.id !== id)
    try {
      await api.delete(`/api/v1/stores/${storeId}/exceptions/${id}`)
      log.info('deleteException ✓', id)
      ui.showToast('success', 'Exception supprimée', '')
    } catch (err) {
      exceptions.value = prev
      log.error('deleteException failed', extractApiError(err))
      ui.showToast('error', 'Erreur', extractApiError(err))
    }
  }

  return {
    // opening hours
    openingHours, loadingHours, savingHours,
    fetchOpeningHours, saveOpeningHours,
    // coverage requirements
    requirements, loadingRequirements, savingRequirement,
    fetchRequirements, createRequirement, updateRequirement, deleteRequirement,
    // exceptions
    exceptions, loadingExceptions, savingException,
    fetchExceptions, createException, deleteException,
  }
})

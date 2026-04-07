import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/composables/useApi'
import { useDirtyState } from '@/composables/useDirtyState'
import { useUiStore } from '@/stores/ui'
import { extractApiError, createDevlog } from '@/utils/logger'

const log = createDevlog('LeaveStore')
import type { LeaveRequest, LeaveImpact, LeaveType } from '@/types'

export const useLeaveStore = defineStore('leave', () => {
  const dirty   = useDirtyState('leave')
  const leaves  = ref<LeaveRequest[]>([])
  const loading = ref(false)

  async function fetchLeave(storeId: string) {
    log.info('fetchLeave →', { storeId })
    loading.value = true
    try {
      // Paginated response: { data: [...], page, per_page, total }
      const res    = await api.get<{ data: LeaveRequest[] }>(`/api/v1/stores/${storeId}/leave-requests`)
      leaves.value = res.data.data ?? []
      log.info('fetchLeave ←', { count: leaves.value.length })
    } catch (err) {
      log.error('fetchLeave failed', err)
      useUiStore().showToast('error', 'Failed to load leave', extractApiError(err))
    } finally {
      loading.value = false
    }
  }

  async function createLeave(storeId: string, payload: { type: LeaveType; start_date: string; end_date: string; reason?: string }) {
    log.info('createLeave →', { storeId, type: payload.type, start: payload.start_date, end: payload.end_date })
    dirty.markSaving()
    try {
      // Non-paginated response: single LeaveRequest object
      const res = await api.post<LeaveRequest>(`/api/v1/stores/${storeId}/leave-requests`, payload)
      leaves.value.push(res.data)
      dirty.markClean()
      log.info('createLeave ← created', { id: res.data.id, status: res.data.status })
      useUiStore().showToast('success', 'Leave request submitted')
    } catch (err) {
      log.error('createLeave failed', err)
      dirty.markError(extractApiError(err))
      throw err
    }
  }

  async function cancelLeave(storeId: string, leaveId: string) {
    log.info('cancelLeave →', { storeId, leaveId })
    try {
      await api.delete(`/api/v1/stores/${storeId}/leave-requests/${leaveId}`)
      leaves.value = leaves.value.filter((l) => l.id !== leaveId)
      log.info('cancelLeave ← removed', { leaveId })
      useUiStore().showToast('success', 'Leave request cancelled')
    } catch (err) {
      log.error('cancelLeave failed', err)
      useUiStore().showToast('error', 'Cancel failed', extractApiError(err))
    }
  }

  /**
   * Fetches the scheduling impact of approving a leave request without committing anything.
   * Used by the approval dialog to show the manager what will be cancelled before they confirm.
   */
  async function fetchLeaveImpact(storeId: string, leaveId: string): Promise<LeaveImpact> {
    const res = await api.get<LeaveImpact>(
      `/api/v1/stores/${storeId}/leave-requests/${leaveId}/impact`,
    )
    return res.data
  }

  async function approveLeave(storeId: string, leaveId: string) {
    log.info('approveLeave →', { storeId, leaveId })
    try {
      const res = await api.put<LeaveRequest>(
        `/api/v1/stores/${storeId}/leave-requests/${leaveId}/review`,
        { status: 'approved' },
      )
      const idx = leaves.value.findIndex((l) => l.id === leaveId)
      if (idx !== -1) leaves.value[idx] = res.data
      log.info('approveLeave ← approved', { leaveId, newStatus: res.data.status })
      useUiStore().showToast('success', 'Leave approved')
    } catch (err) {
      log.error('approveLeave failed', err)
      useUiStore().showToast('error', 'Approve failed', extractApiError(err))
    }
  }

  async function rejectLeave(storeId: string, leaveId: string) {
    log.info('rejectLeave →', { storeId, leaveId })
    try {
      const res = await api.put<LeaveRequest>(
        `/api/v1/stores/${storeId}/leave-requests/${leaveId}/review`,
        { status: 'rejected' },
      )
      const idx = leaves.value.findIndex((l) => l.id === leaveId)
      if (idx !== -1) leaves.value[idx] = res.data
      log.info('rejectLeave ← rejected', { leaveId, newStatus: res.data.status })
      useUiStore().showToast('success', 'Leave rejected')
    } catch (err) {
      log.error('rejectLeave failed', err)
      useUiStore().showToast('error', 'Reject failed', extractApiError(err))
    }
  }

  const pendingLeave = computed(() => leaves.value.filter((l) => l.status === 'pending'))

  return { leaves, loading, dirty, fetchLeave, createLeave, cancelLeave, fetchLeaveImpact, approveLeave, rejectLeave, pendingLeave }
})

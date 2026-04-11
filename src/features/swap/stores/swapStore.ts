import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { extractApiError, createDevlog } from '@/utils/logger'

const log = createDevlog('SwapStore')
import type { SwapRequest } from '@/types'

export const useSwapStore = defineStore('swap', () => {
  const { t } = useI18n()
  const swaps   = ref<SwapRequest[]>([])
  const loading = ref(false)
  const auth    = useAuthStore()

  const pendingIncoming = computed(() =>
    swaps.value.filter(
      (s) => s.status === 'pending' && s.target_employee_id === auth.user?.id,
    ),
  )

  async function fetchSwaps(storeId: string) {
    log.info('fetchSwaps →', { storeId })
    loading.value = true
    try {
      const res    = await api.get<{ data: SwapRequest[] }>(`/api/v1/stores/${storeId}/swap-requests`)
      swaps.value  = res.data.data ?? []
      log.info('fetchSwaps ←', { count: swaps.value.length, pendingIncoming: pendingIncoming.value.length })
    } catch (err) {
      log.error('fetchSwaps failed', err)
      useUiStore().showToast('error', t('errors.loadFailed'), extractApiError(err))
    } finally {
      loading.value = false
    }
  }

  async function createSwap(storeId: string, payload: { shift_instance_id: string; target_employee_id?: string; note?: string }) {
    log.info('createSwap →', { storeId, shiftInstanceId: payload.shift_instance_id, targetEmployeeId: payload.target_employee_id })
    try {
      const res = await api.post<SwapRequest>(`/api/v1/stores/${storeId}/swap-requests`, payload)
      swaps.value.push(res.data)
      log.info('createSwap ← created', { swapId: res.data.id, status: res.data.status })
      useUiStore().showToast('success', t('swap.requestSent'))
    } catch (err) {
      log.error('createSwap failed', err)
      useUiStore().showToast('error', t('errors.swapRequestFailed'), extractApiError(err))
      throw err
    }
  }

  async function respondToSwap(storeId: string, swapId: string, action: 'accept' | 'decline') {
    // Backend expects status: 'accepted' | 'rejected'
    const status = action === 'accept' ? 'accepted' : 'rejected'
    log.info('respondToSwap →', { storeId, swapId, action, status })
    try {
      const res = await api.put<SwapRequest>(
        `/api/v1/stores/${storeId}/swap-requests/${swapId}/review`,
        { status },
      )
      const idx = swaps.value.findIndex((s) => s.id === swapId)
      if (idx !== -1) swaps.value[idx] = res.data
      log.info('respondToSwap ←', { swapId, action, newStatus: res.data.status })
      useUiStore().showToast('success', action === 'accept' ? t('swap.accepted') : t('swap.declined'))
    } catch (err) {
      log.error('respondToSwap failed', { swapId, action }, err)
      useUiStore().showToast('error', t('errors.swapActionFailed'), extractApiError(err))
      throw err
    }
  }

  return { swaps, loading, pendingIncoming, fetchSwaps, createSwap, respondToSwap }
})

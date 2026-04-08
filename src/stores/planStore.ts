import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { createDevlog, extractApiError } from '@/utils/logger'
import type { SchedulePlan, PlanState, RecordOverrideRequest } from '@/types'

const log = createDevlog('PlanStore')

export const usePlanStore = defineStore('plan', () => {
  const api = useApi()

  const plan = ref<SchedulePlan | null>(null)
  const loading = ref(false)
  const publishing = ref(false)
  const error = ref<string | null>(null)

  const state = computed<PlanState | null>(() => plan.value?.state ?? null)
  const isDraft = computed(() => state.value === 'DRAFT')
  const isPublished = computed(() => state.value === 'PUBLISHED')
  const isLive = computed(() => state.value === 'LIVE')
  const canPublish = computed(() => isDraft.value)
  const canRollback = computed(() => (plan.value?.snapshots?.length ?? 0) > 1)

  async function fetchOrCreate(storeId: string, weekStart: string) {
    log.info('fetchOrCreate →', { storeId, weekStart })
    loading.value = true
    error.value = null
    try {
      const res = await api.get<SchedulePlan>(
        `/api/v1/stores/${storeId}/plans?week=${weekStart}`
      )
      plan.value = res.data
      log.info('fetchOrCreate ←', { planId: res.data.id, state: res.data.state })
    } catch (err) {
      error.value = extractApiError(err)
      log.error('fetchOrCreate failed', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function publish(storeId: string, note?: string) {
    if (!plan.value) {
      log.warn('publish called with no plan loaded')
      return
    }
    const planId = plan.value.id
    log.info('publish →', { storeId, planId, note })
    publishing.value = true
    error.value = null
    try {
      const res = await api.post<SchedulePlan>(
        `/api/v1/stores/${storeId}/plans/${planId}/publish`,
        { note }
      )
      plan.value = res.data
      log.info('publish ← PUBLISHED', { planId, version: res.data.version })
    } catch (err) {
      error.value = extractApiError(err)
      log.error('publish failed', err)
      throw err
    } finally {
      publishing.value = false
    }
  }

  async function recordOverride(storeId: string, payload: RecordOverrideRequest) {
    if (!plan.value) {
      log.warn('recordOverride called with no plan loaded')
      return
    }
    const planId = plan.value.id
    log.info('recordOverride →', { storeId, planId, shiftIds: payload.shift_ids })
    try {
      const res = await api.post<{ status: string }>(
        `/api/v1/stores/${storeId}/plans/${planId}/override`,
        payload
      )
      log.info('recordOverride ← ok', { planId, status: res.data.status })
    } catch (err) {
      log.error('recordOverride failed', err)
      throw err
    }
  }

  async function rollback(storeId: string, snapshotVersion?: number, note?: string) {
    if (!plan.value) {
      log.warn('rollback called with no plan loaded')
      return
    }
    const planId = plan.value.id
    log.info('rollback →', { storeId, planId, snapshotVersion })
    try {
      const res = await api.post<SchedulePlan>(
        `/api/v1/stores/${storeId}/plans/${planId}/rollback`,
        { snapshot_version: snapshotVersion ?? 1, note }
      )
      plan.value = res.data
      log.info('rollback ← DRAFT', { planId, newState: res.data.state })
    } catch (err) {
      log.error('rollback failed', err)
      throw err
    }
  }

  async function getHistory(storeId: string) {
    if (!plan.value) {
      log.warn('getHistory called with no plan loaded')
      return []
    }
    const planId = plan.value.id
    log.info('getHistory →', { storeId, planId })
    try {
      const res = await api.get<{ snapshots: unknown[] }>(
        `/api/v1/stores/${storeId}/plans/${planId}/history`
      )
      const snapshots = res.data?.snapshots ?? []
      log.info('getHistory ←', { planId, snapshotCount: snapshots.length })
      return snapshots
    } catch (err) {
      log.error('getHistory failed', err)
      throw err
    }
  }

  function $reset() {
    log.debug('$reset')
    plan.value = null
    loading.value = false
    publishing.value = false
    error.value = null
  }

  return {
    plan, loading, publishing, error,
    state, isDraft, isPublished, isLive, canPublish, canRollback,
    fetchOrCreate, publish, recordOverride, rollback, getHistory, $reset,
  }
})

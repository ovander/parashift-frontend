import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import { useDirtyState } from '@/composables/useDirtyState'
import { useUiStore } from '@/stores/ui'
import { extractApiError, createDevlog } from '@/utils/logger'

const log = createDevlog('RulesStore')
import type { Rule } from '@/types'

export const useRulesStore = defineStore('rules', () => {
  const dirty   = useDirtyState('rules')
  const rules   = ref<Rule[]>([])
  const loading = ref(false)

  async function fetchRules(storeId: string) {
    loading.value = true
    try {
      const res   = await api.get<Rule[]>(`/api/v1/stores/${storeId}/rules`)
      rules.value = res.data ?? []
    } catch (err) {
      useUiStore().showToast('error', 'Failed to load rules', extractApiError(err))
    } finally {
      loading.value = false
    }
  }

  async function createRule(storeId: string, payload: Omit<Rule, 'id' | 'store_id' | 'created_at' | 'updated_at'>) {
    log.info('createRule →', JSON.parse(JSON.stringify(payload)))
    dirty.markSaving()
    try {
      const res  = await api.post<Rule>(`/api/v1/stores/${storeId}/rules`, payload)
      rules.value.push(res.data)
      dirty.markClean()
      log.info('createRule ← created', { id: res.data.id, rule_type: res.data.rule_type })
      useUiStore().showToast('success', 'Rule created')
    } catch (err: any) {
      const detail = err?.response?.data?.error ?? err?.response?.data ?? err?.message
      log.error('createRule failed', { status: err?.response?.status, detail })
      dirty.markError(extractApiError(err))
      throw err
    }
  }

  async function updateRule(storeId: string, ruleId: string, payload: Partial<Rule>) {
    dirty.markSaving()
    try {
      const res = await api.put<Rule>(`/api/v1/stores/${storeId}/rules/${ruleId}`, payload)
      const idx = rules.value.findIndex((r) => r.id === ruleId)
      if (idx !== -1) rules.value[idx] = res.data
      dirty.markClean()
      useUiStore().showToast('success', 'Rule updated')
    } catch (err) {
      dirty.markError(extractApiError(err))
      throw err
    }
  }

  async function toggleEnabled(storeId: string, ruleId: string) {
    const rule = rules.value.find((r) => r.id === ruleId)
    if (!rule) return
    await updateRule(storeId, ruleId, { is_enabled: !rule.is_enabled })
  }

  async function deleteRule(storeId: string, ruleId: string) {
    try {
      await api.delete(`/api/v1/stores/${storeId}/rules/${ruleId}`)
      rules.value = rules.value.filter((r) => r.id !== ruleId)
      useUiStore().showToast('success', 'Rule deleted')
    } catch (err) {
      useUiStore().showToast('error', 'Delete failed', extractApiError(err))
      throw err
    }
  }

  return { rules, loading, dirty, fetchRules, createRule, updateRule, toggleEnabled, deleteRule }
})

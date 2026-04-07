import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import { useDirtyState } from '@/composables/useDirtyState'
import { useUiStore } from '@/stores/ui'
import { extractApiError, createDevlog } from '@/utils/logger'
import type { ShiftTemplate } from '@/types'

const log = createDevlog('TemplateStore')

export const useTemplateStore = defineStore('template', () => {
  const dirty      = useDirtyState('template')
  const templates  = ref<ShiftTemplate[]>([])
  const loading    = ref(false)
  const publishing = ref(false)

  const schemeA = () => templates.value.filter((t) => t.scheme === 'A')
  const schemeB = () => templates.value.filter((t) => t.scheme === 'B')

  async function fetchTemplates(storeId: string) {
    loading.value = true
    try {
      const res        = await api.get<ShiftTemplate[]>(`/api/v1/stores/${storeId}/templates`)
      templates.value  = res.data ?? []
      log.info('fetchTemplates ←', { count: templates.value.length })
    } catch (err) {
      log.error('fetchTemplates failed', extractApiError(err))
      useUiStore().showToast('error', 'Failed to load templates', extractApiError(err))
    } finally {
      loading.value = false
    }
  }

  async function saveTemplate(storeId: string, payload: Omit<ShiftTemplate, 'id' | 'store_id'>) {
    log.info('saveTemplate →', JSON.parse(JSON.stringify(payload)))
    dirty.markSaving()
    try {
      const res = await api.post<ShiftTemplate>(`/api/v1/stores/${storeId}/templates`, payload)
      templates.value.push(res.data)
      dirty.markClean()
      log.info('saveTemplate ← created', { id: res.data.id, scheme: res.data.scheme })
    } catch (err: any) {
      const detail = err?.response?.data?.error ?? err?.response?.data ?? err?.message
      log.error('saveTemplate failed', { status: err?.response?.status, detail })
      dirty.markError(extractApiError(err))
      throw err
    }
  }

  async function deleteTemplate(storeId: string, templateId: string) {
    log.info('deleteTemplate →', { templateId })
    try {
      await api.delete(`/api/v1/stores/${storeId}/templates/${templateId}`)
      templates.value = templates.value.filter((t) => t.id !== templateId)
      dirty.markDirty()
      log.info('deleteTemplate ← done')
    } catch (err) {
      log.error('deleteTemplate failed', extractApiError(err))
      useUiStore().showToast('error', 'Delete failed', extractApiError(err))
    }
  }

  async function publishTemplate(storeId: string, scheme: 'A' | 'B') {
    const tmpl = templates.value.find((t) => t.scheme === scheme)
    log.info('publishTemplate →', { scheme, slotId: tmpl?.id })
    if (!tmpl) {
      log.warn('publishTemplate: no slot found for scheme', scheme)
      useUiStore().showToast('error', 'Publish failed', `No shifts defined for Schedule ${scheme}`)
      return
    }
    publishing.value = true
    try {
      const res = await api.post<{ shifts_created: number }>(`/api/v1/stores/${storeId}/templates/${tmpl.id}/publish`)
      log.info('publishTemplate ←', { shifts_created: res.data.shifts_created })
      useUiStore().showToast('success', `Schedule ${scheme} published`, `${res.data.shifts_created} shifts generated for the next 4 weeks`)
    } catch (err: any) {
      const detail = err?.response?.data?.error ?? err?.response?.data ?? err?.message
      log.error('publishTemplate failed', { status: err?.response?.status, detail })
      useUiStore().showToast('error', 'Publish failed', extractApiError(err))
      throw err
    } finally {
      publishing.value = false
    }
  }

  return { templates, loading, publishing, dirty, schemeA, schemeB, fetchTemplates, saveTemplate, deleteTemplate, publishTemplate }
})

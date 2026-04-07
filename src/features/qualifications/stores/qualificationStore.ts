import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { createDevlog, extractApiError } from '@/utils/logger'
import type {
  Qualification,
  EmployeeQualification,
  CreateQualificationRequest,
  AddEmployeeQualificationRequest,
} from '@/types'

const log = createDevlog('QualificationStore')

export const useQualificationStore = defineStore('qualification', () => {
  const api = useApi()

  const qualifications = ref<Qualification[]>([])
  const employeeQuals = ref<Map<string, EmployeeQualification[]>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchQualifications(storeId: string) {
    log.info('fetchQualifications →', { storeId })
    loading.value = true
    error.value = null
    try {
      const res = await api.get<Qualification[]>(`/api/v1/stores/${storeId}/qualifications`)
      qualifications.value = res.data ?? []
      log.info('fetchQualifications ←', { count: qualifications.value.length })
    } catch (err) {
      error.value = extractApiError(err)
      log.error('fetchQualifications failed', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployeeQuals(storeId: string, employeeId: string) {
    log.debug('fetchEmployeeQuals →', { storeId, employeeId })
    try {
      const res = await api.get<EmployeeQualification[]>(
        `/api/v1/stores/${storeId}/employees/${employeeId}/qualifications`
      )
      const list = res.data ?? []
      employeeQuals.value.set(employeeId, list)
      log.debug('fetchEmployeeQuals ←', { employeeId, count: list.length })
    } catch (err) {
      log.error('fetchEmployeeQuals failed', { employeeId }, err)
      throw err
    }
  }

  async function createQualification(storeId: string, payload: CreateQualificationRequest) {
    log.info('createQualification →', { storeId, name: payload.name })
    try {
      const res = await api.post<Qualification>(`/api/v1/stores/${storeId}/qualifications`, payload)
      qualifications.value.push(res.data)
      log.info('createQualification ← created', { id: res.data.id, name: res.data.name })
      return res.data
    } catch (err) {
      log.error('createQualification failed', err)
      throw err
    }
  }

  async function addEmployeeQualification(
    storeId: string,
    employeeId: string,
    payload: AddEmployeeQualificationRequest
  ) {
    log.info('addEmployeeQualification →', { storeId, employeeId, qualId: payload.qualification_id })
    try {
      const res = await api.post<EmployeeQualification>(
        `/api/v1/stores/${storeId}/employees/${employeeId}/qualifications`,
        payload
      )
      const existing = employeeQuals.value.get(employeeId) ?? []
      employeeQuals.value.set(employeeId, [...existing, res.data])
      log.info('addEmployeeQualification ← assigned', { eqId: res.data.id, employeeId })
      return res.data
    } catch (err) {
      log.error('addEmployeeQualification failed', err)
      throw err
    }
  }

  async function removeEmployeeQualification(
    storeId: string,
    employeeId: string,
    qualId: string
  ) {
    log.info('removeEmployeeQualification →', { storeId, employeeId, qualId })
    try {
      await api.delete(
        `/api/v1/stores/${storeId}/employees/${employeeId}/qualifications/${qualId}`
      )
      const existing = employeeQuals.value.get(employeeId) ?? []
      employeeQuals.value.set(employeeId, existing.filter((q) => q.id !== qualId))
      log.info('removeEmployeeQualification ← removed', { qualId, employeeId })
    } catch (err) {
      log.error('removeEmployeeQualification failed', err)
      throw err
    }
  }

  function getEmployeeQuals(employeeId: string): EmployeeQualification[] {
    return employeeQuals.value.get(employeeId) ?? []
  }

  function hasQualification(employeeId: string, qualificationId: string): boolean {
    const has = getEmployeeQuals(employeeId).some(
      (q) => q.qualification_id === qualificationId && q.verified
    )
    log.debug('hasQualification', { employeeId, qualificationId, result: has })
    return has
  }

  return {
    qualifications, employeeQuals, loading, error,
    fetchQualifications, fetchEmployeeQuals,
    createQualification, addEmployeeQualification, removeEmployeeQualification,
    getEmployeeQuals, hasQualification,
  }
})

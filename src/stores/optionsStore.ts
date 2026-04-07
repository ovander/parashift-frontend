/**
 * useOptionsStore — single source of truth for all selectable option lists.
 *
 * Options are fetched once from GET /api/v1/options and cached for the
 * lifetime of the session.  Components must never define their own static
 * arrays for <Select> / <Dropdown> / <RadioGroup> — they consume this store
 * instead.
 *
 * Loading state is exposed so consumers can show skeletons while the first
 * fetch is in flight.  If the fetch fails, `error` is set and the store
 * stays empty — consumers should handle this gracefully (disable the select,
 * show an inline error, or retry).
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/composables/useApi'
import { createDevlog, extractApiError } from '@/utils/logger'

const log = createDevlog('OptionsStore')

// ── Shared types ──────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string | number
  label: string
}

export interface SelectOptionWithDesc extends SelectOption {
  description?: string
}

// ── API response shape (mirrors options_handler.go › optionsResponse) ─────────

interface OptionsResponse {
  employee_positions:  SelectOptionWithDesc[]  // manager|employee — RBAC access
  job_roles:           SelectOptionWithDesc[]  // pharmacist|animator|... — shift eligibility
  leave_types:         SelectOption[]
  rule_types:          SelectOptionWithDesc[]
  rule_severities:     SelectOptionWithDesc[]
  days_of_week:        SelectOption[]
  shift_statuses:      SelectOption[]
  assignment_statuses: SelectOption[]
  plan_states:         SelectOption[]
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useOptionsStore = defineStore('options', () => {
  const data    = ref<OptionsResponse | null>(null)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  /** True once options have been successfully loaded. */
  const ready = computed(() => data.value !== null)

  /**
   * Fetch all option lists from the backend.
   * Idempotent — subsequent calls are no-ops if options are already loaded.
   * Pass `force: true` to re-fetch (useful after a config change).
   */
  async function fetchOptions(force = false): Promise<void> {
    if (data.value !== null && !force) return   // already loaded
    if (loading.value) return                   // fetch already in flight

    loading.value = true
    error.value   = null
    log.info('fetchOptions →')

    try {
      const res  = await api.get<OptionsResponse>('/api/v1/options')
      data.value = res.data
      log.info('fetchOptions ←', {
        positions: res.data.employee_positions.length,
        jobRoles:  res.data.job_roles.length,
        leaves:    res.data.leave_types.length,
        rules:     res.data.rule_types.length,
      })
    } catch (err) {
      error.value = extractApiError(err)
      log.error('fetchOptions failed', err)
    } finally {
      loading.value = false
    }
  }

  // ── Typed accessors ───────────────────────────────────────────────────────
  // Each accessor returns an empty array while loading so <Select> components
  // render immediately without null-checks in every template.

  const employeePositions  = computed<SelectOptionWithDesc[]>(() => data.value?.employee_positions  ?? [])
  const jobRoles           = computed<SelectOptionWithDesc[]>(() => data.value?.job_roles           ?? [])
  const leaveTypes         = computed<SelectOption[]>        (() => data.value?.leave_types         ?? [])
  const ruleTypes          = computed<SelectOptionWithDesc[]>(() => data.value?.rule_types          ?? [])
  const ruleSeverities     = computed<SelectOptionWithDesc[]>(() => data.value?.rule_severities     ?? [])
  const daysOfWeek         = computed<SelectOption[]>        (() => data.value?.days_of_week        ?? [])
  const shiftStatuses      = computed<SelectOption[]>        (() => data.value?.shift_statuses      ?? [])
  const assignmentStatuses = computed<SelectOption[]>        (() => data.value?.assignment_statuses ?? [])
  const planStates         = computed<SelectOption[]>        (() => data.value?.plan_states         ?? [])

  return {
    // State
    loading,
    error,
    ready,
    // Actions
    fetchOptions,
    // Accessors
    employeePositions,
    jobRoles,
    leaveTypes,
    ruleTypes,
    ruleSeverities,
    daysOfWeek,
    shiftStatuses,
    assignmentStatuses,
    planStates,
  }
})

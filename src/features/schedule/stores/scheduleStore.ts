import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDirtyState } from '@/composables/useDirtyState'
import { useScheduleApi } from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'
import { useRuleViolations } from '@/features/schedule/composables/useRuleViolations'
import { extractApiError, createDevlog } from '@/utils/logger'

const log = createDevlog('ScheduleStore')
import type {
  ShiftInstance,
  Assignment,
  RuleViolation,
  CreateAssignmentRequest,
  StoreException,
  CreateStoreExceptionRequest,
} from '@/types'

export const useScheduleStore = defineStore('schedule', () => {
  const { t } = useI18n()
  const dirty = useDirtyState('schedule')
  const api   = useScheduleApi()
  const ui    = useUiStore()
  const rv    = useRuleViolations()

  const shifts:      Ref<ShiftInstance[]>   = ref([])
  const assignments: Ref<Assignment[]>      = ref([])
  const exceptions:  Ref<StoreException[]>  = ref([])
  const loading                             = ref(false)

  // ── Computed projections ────────────────────────────────────────────────

  const assignedShiftIds = computed(() =>
    new Set(assignments.value.map((a) => a.shift_id)),
  )

  const unassignedShifts = computed(() =>
    shifts.value.filter((s) => !assignedShiftIds.value.has(s.id)),
  )

  const assignmentsByShift = computed(() => {
    const m = new Map<string, Assignment[]>()
    for (const a of assignments.value) {
      const bucket = m.get(a.shift_id) ?? []
      bucket.push(a)
      m.set(a.shift_id, bucket)
    }
    return m
  })

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * Load all shifts and assignments for the week that starts on `weekStart`.
   * Pass `silent = true` to suppress the loading overlay (e.g. background
   * refreshes triggered by coverage updates).
   */
  async function fetchWeek(storeId: string, weekStart: string, silent = false) {
    log.info('fetchWeek →', { storeId, weekStart, silent })
    if (!silent) {
      loading.value = true
      ui.setLoading(true, 'Loading schedule…')
    }
    try {
      // Compute the full-week date range for the exceptions query (Mon → Sun).
      const weekEnd = (() => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + 6)
        return d.toISOString().slice(0, 10)
      })()

      // Fetch shifts FIRST — the backend auto-projects from A/B templates when
      // the week is empty, which also creates the assignments. If we fetch
      // assignments in parallel, we race against that creation and get 0.
      const shiftsRes = await api.get<ShiftInstance[]>(
        `/api/v1/stores/${storeId}/shifts?week_of=${weekStart}`,
      )
      shifts.value = shiftsRes.data ?? []

      // Now fetch assignments + exceptions in parallel — auto-projection is done.
      const [assignRes, excRes] = await Promise.all([
        api.get<Assignment[]>(
          `/api/v1/stores/${storeId}/assignments?week_of=${weekStart}`,
        ),
        api.get<StoreException[]>(
          `/api/v1/stores/${storeId}/exceptions?from=${weekStart}&to=${weekEnd}`,
        ).catch(() => ({ data: [] as StoreException[] })), // non-fatal
      ])
      // Filter out cancelled assignments — they represent removed coverage and
      // should never appear in the planner or employee week view.
      assignments.value = (assignRes.data ?? []).filter((a) => a.status !== 'cancelled')
      exceptions.value  = excRes.data    ?? []

      // Seed the violations registry directly from the assignment list.
      // The API now embeds shift_id + employee_id on every RuleViolation,
      // so no composite-key reconstruction is needed.
      rv.clearAll()
      rv.loadFromAssignments(assignments.value)
      log.info('fetchWeek ←', { shifts: shifts.value.length, assignments: assignments.value.length, exceptions: exceptions.value.length })
    } finally {
      if (!silent) {
        loading.value = false
        ui.setLoading(false)
      }
    }
  }

  /**
   * Assign `employeeId` to `shiftId`.
   *
   * Uses an optimistic update: the assignment is added to local state
   * immediately and replaced by the server response on success, or rolled
   * back on failure.
   *
   * Returns the list of non-blocking violations (may be empty).
   * Throws `BlockingViolationError` when the backend rejects the assignment.
   */
  async function assign(storeId: string, shiftId: string, employeeId: string): Promise<RuleViolation[]> {
    log.info('assign →', { storeId, shiftId, employeeId })
    const prevAssignments = [...assignments.value]

    // Seed denormalized date fields from the local shift so FullCalendar
    // never receives an empty "T" string (which would throw "Invalid time value").
    const sourceShift = shifts.value.find((s) => s.id === shiftId)

    const optimistic: Assignment = {
      id:               `optimistic-${Date.now()}`,
      store_id:         storeId,
      shift_id:         shiftId,
      employee_id:      employeeId,
      status:           'pending',
      shift_date:       sourceShift?.date       ?? '',
      shift_start_time: sourceShift?.start_time ?? '',
      shift_end_time:   sourceShift?.end_time   ?? '',
      violations:       [],
      created_at:       new Date().toISOString(),
    }
    assignments.value = [...assignments.value, optimistic]

    const body: CreateAssignmentRequest = { shift_id: shiftId, employee_id: employeeId }

    try {
      const res = await api.post<Assignment>(
        `/api/v1/stores/${storeId}/assignments`,
        body,
      )
      const created: Assignment = res.data

      // Replace optimistic entry with the real one
      assignments.value = [
        ...assignments.value.filter((a) => a.id !== optimistic.id),
        created,
      ]

      // Populate violation registry — shift_id / employee_id are embedded
      // in each violation by the backend, so we can go straight through the
      // structured-key path.
      rv.setViolations(
        { shiftId: created.shift_id, employeeId: created.employee_id },
        created.violations,
      )

      if (created.violations.some((v) => v.severity === 'BLOCKING')) {
        // Should not happen (blocking → 422), but guard defensively.
        log.warn('assign ← blocking violation in 200 response — rolling back', created.violations)
        assignments.value = prevAssignments
        throw new BlockingViolationError(created.violations)
      }

      log.info('assign ← ok', { assignmentId: created.id, violations: created.violations.length })

      // Background coverage refresh (non-blocking)
      import('@/features/coverage/stores/coverageStore').then(({ useCoverageStore }) => {
        useCoverageStore().fetchCoverage(storeId, true)
      })

      return created.violations
    } catch (err) {
      if (err instanceof BlockingViolationError) throw err

      // The backend returned 422 with a ValidationError body
      const apiErr = err as { response?: { data?: { violations?: RuleViolation[] } } }
      const blockingViolations = apiErr?.response?.data?.violations ?? []
      if (blockingViolations.length > 0) {
        log.warn('assign ← BLOCKING violation (422)', { shiftId, employeeId, count: blockingViolations.length })
        rv.setViolations({ shiftId, employeeId }, blockingViolations)
        assignments.value = prevAssignments
        throw new BlockingViolationError(blockingViolations)
      }

      // Generic network / server error
      log.error('assign failed — rolling back', err)
      assignments.value = prevAssignments
      ui.showToast('error', t('errors.assignmentFailed'), extractApiError(err))
      throw err
    }
  }

  /**
   * Remove an assignment by ID.
   * Rolls back local state if the request fails.
   */
  async function unassign(storeId: string, assignmentId: string): Promise<void> {
    log.info('unassign →', { storeId, assignmentId })
    const removed = assignments.value.find((a) => a.id === assignmentId)
    const prev    = [...assignments.value]
    assignments.value = assignments.value.filter((a) => a.id !== assignmentId)

    try {
      await api.delete(`/api/v1/stores/${storeId}/assignments/${assignmentId}`)

      if (removed) {
        rv.clearCell({ shiftId: removed.shift_id, employeeId: removed.employee_id })
      }

      log.info('unassign ← ok', { assignmentId })

      import('@/features/coverage/stores/coverageStore').then(({ useCoverageStore }) => {
        useCoverageStore().fetchCoverage(storeId, true)
      })
    } catch (err) {
      log.error('unassign failed — rolling back', err)
      assignments.value = prev
      ui.showToast('error', t('errors.unassignFailed'), extractApiError(err))
      throw err
    }
  }

  /**
   * Delete all assignments for the week that starts on `weekStart` (YYYY-MM-DD).
   * Clears local state optimistically, then calls the backend.
   * On failure the UI reloads from server.
   */
  async function resetWeek(storeId: string, weekStart: string): Promise<number> {
    log.info('resetWeek →', { storeId, weekStart })
    ui.setLoading(true, 'Resetting week assignments…')

    try {
      const res = await api.delete<{ deleted: number; week_start: string }>(
        `/api/v1/stores/${storeId}/assignments?week_of=${weekStart}`,
      )
      const deleted = res.data?.deleted ?? 0

      // Clear local state: remove all assignments for this week
      assignments.value = []
      rv.clearAll()

      log.info('resetWeek ← ok', { deleted })

      ui.showToast(
        'success',
        t('schedule.weekReset'),
        t('schedule.weekResetDetail', { count: deleted }),
      )

      // Refresh coverage after reset (non-blocking)
      import('@/features/coverage/stores/coverageStore').then(({ useCoverageStore }) => {
        useCoverageStore().fetchCoverage(storeId, true)
      })

      return deleted
    } catch (err) {
      log.error('resetWeek failed', err)
      ui.showToast('error', t('errors.resetFailed'), extractApiError(err))
      // Re-fetch assignments to restore consistent state
      await fetchWeek(storeId, weekStart, true)
      throw err
    } finally {
      ui.setLoading(false)
    }
  }

  /**
   * Create a new store exception (EXTRA_OPEN or FORCED_CLOSED) for the given date.
   * Adds to local state optimistically; rolls back on failure.
   */
  async function createException(storeId: string, req: CreateStoreExceptionRequest): Promise<StoreException> {
    log.info('createException →', { storeId, req })
    const res = await api.post<StoreException>(`/api/v1/stores/${storeId}/exceptions`, req)
    const created = res.data
    exceptions.value = [...exceptions.value, created]
    log.info('createException ← ok', { id: created.id })
    return created
  }

  /**
   * Delete a store exception by ID.
   * Removes from local state immediately; restores on failure.
   */
  async function deleteException(storeId: string, exceptionId: string): Promise<void> {
    log.info('deleteException →', { storeId, exceptionId })
    const prev = [...exceptions.value]
    exceptions.value = exceptions.value.filter((e) => e.id !== exceptionId)
    try {
      await api.delete(`/api/v1/stores/${storeId}/exceptions/${exceptionId}`)
      log.info('deleteException ← ok', { exceptionId })
    } catch (err) {
      log.error('deleteException failed — rolling back', err)
      exceptions.value = prev
      ui.showToast('error', t('errors.deleteFailed'), extractApiError(err))
      throw err
    }
  }

  /**
   * Mark an assignment as acknowledged by the employee.
   *
   * Sends POST /assignments/:id/acknowledge.  If the endpoint returns 404
   * (not yet deployed) the local state is still updated optimistically so
   * the UI doesn't break during the rollout window.
   */
  async function acknowledgeAssignment(storeId: string, assignmentId: string): Promise<void> {
    log.info('acknowledgeAssignment →', { storeId, assignmentId })
    // Optimistic update first
    const idx = assignments.value.findIndex((a) => a.id === assignmentId)
    if (idx !== -1) {
      assignments.value[idx] = { ...assignments.value[idx], acknowledged_at: new Date().toISOString() }
    }
    try {
      const res = await api.post<{ acknowledged_at: string }>(
        `/api/v1/stores/${storeId}/assignments/${assignmentId}/acknowledge`,
      )
      if (idx !== -1 && res.data?.acknowledged_at) {
        assignments.value[idx] = { ...assignments.value[idx], acknowledged_at: res.data.acknowledged_at }
      }
      log.info('acknowledgeAssignment ← ok', { assignmentId })
    } catch (err: any) {
      // 404 = endpoint not yet implemented — keep the optimistic state
      if (err?.response?.status !== 404) {
        log.error('acknowledgeAssignment failed', err)
        // Roll back optimistic update for genuine errors
        if (idx !== -1) {
          assignments.value[idx] = { ...assignments.value[idx], acknowledged_at: undefined }
        }
        ui.showToast('error', t('schedule.confirmShiftFailed'), extractApiError(err))
        throw err
      }
      log.warn('acknowledgeAssignment ← 404 (endpoint pending deployment) — keeping optimistic state')
    }
  }

  /**
   * Hard-reset the week: delete all shifts + assignments then re-project from
   * A/B templates.  Reloads the week after completion.
   */
  async function regenerateWeek(storeId: string, weekStart: string): Promise<void> {
    log.info('regenerateWeek →', { storeId, weekStart })
    loading.value = true
    ui.setLoading(true, 'Regenerating schedule from templates…')
    try {
      await api.post(`/api/v1/stores/${storeId}/shifts/regenerate?week_of=${weekStart}`)
      ui.showToast('success', t('schedule.regenerated'), t('schedule.regeneratedDetail'))
      await fetchWeek(storeId, weekStart, true)
    } catch (err) {
      log.error('regenerateWeek failed', err)
      ui.showToast('error', t('errors.generationFailed'), extractApiError(err))
      throw err
    } finally {
      loading.value = false
      ui.setLoading(false)
    }
  }

  /**
   * Generate shifts from A/B templates for a date range (date_from → date_to).
   * Replaces all TEMPLATE-sourced shifts in the range.
   * Used for full-store resets and initial schedule builds.
   */
  async function generateFromTemplates(
    storeId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<number> {
    log.info('generateFromTemplates →', { storeId, dateFrom, dateTo })
    ui.setLoading(true, 'Generating schedule from A/B templates…')
    try {
      const res = await api.post<{ shifts_created: number }>(
        `/api/v1/stores/${storeId}/shifts/generate`,
        { date_from: dateFrom, date_to: dateTo },
      )
      const count = res.data.shifts_created ?? 0
      log.info('generateFromTemplates ←', { count })
      ui.showToast('success', t('schedule.generated'), t('schedule.generatedDetail', { count }))
      return count
    } catch (err) {
      log.error('generateFromTemplates failed', err)
      ui.showToast('error', t('errors.generationFailed'), extractApiError(err))
      throw err
    } finally {
      ui.setLoading(false)
    }
  }

  return {
    shifts,
    assignments,
    exceptions,
    loading,
    dirty,
    assignedShiftIds,
    unassignedShifts,
    assignmentsByShift,
    fetchWeek,
    assign,
    unassign,
    resetWeek,
    createException,
    deleteException,
    regenerateWeek,
    generateFromTemplates,
    acknowledgeAssignment,
  }
})

export class BlockingViolationError extends Error {
  readonly violations: RuleViolation[]

  constructor(violations: RuleViolation[]) {
    super('Assignment blocked by one or more BLOCKING rule violations.')
    this.name       = 'BlockingViolationError'
    this.violations = violations
  }
}

// TypeScript narrowing helper
export function isBlockingViolationError(err: unknown): err is BlockingViolationError {
  return err instanceof BlockingViolationError
}

// Re-export the Ref type alias used inside the store so external consumers
// can reference it without importing from Vue directly.
import type { Ref } from 'vue'

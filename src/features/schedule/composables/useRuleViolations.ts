/**
 * useRuleViolations — shared singleton registry for rule violations.
 *
 * The registry is keyed by a stable string derived from a structured
 * `RuleViolationKey` so TypeScript enforces key shape at every call site.
 * The raw string is never constructed inline — always go through the helpers
 * exported from `@/types`.
 *
 * Seeding from the API
 * ────────────────────
 * The backend now embeds `shift_id` and `employee_id` on every `RuleViolation`
 * object, so you can populate the registry directly from an `Assignment[]`
 * response without any context reconstruction:
 *
 *   const { loadFromAssignments } = useRuleViolations()
 *   loadFromAssignments(assignments)
 */

import { ref } from 'vue'
import type { Assignment, RuleViolation, ViolationSeverity } from '@/types'
import {
  type RuleViolationKey,
  ruleViolationKeyToString,
} from '@/types'

// Module-level singleton — all components read the same reactive Map.
const registry = ref<Map<string, RuleViolation[]>>(new Map())

export function useRuleViolations() {
  // ── Internal helpers ────────────────────────────────────────────────────

  function toKey(key: RuleViolationKey): string {
    return ruleViolationKeyToString(key)
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Populate the registry from a list of Assignment objects.
   * Replaces any existing entries for the same (shiftId, employeeId) pairs.
   */
  function loadFromAssignments(assignments: Assignment[]): void {
    const next = new Map(registry.value)
    for (const a of assignments) {
      if (a.violations.length > 0) {
        next.set(toKey({ shiftId: a.shift_id, employeeId: a.employee_id }), a.violations)
      }
    }
    registry.value = next
  }

  /**
   * Manually set violations for a specific (shiftId, employeeId) pair.
   * Useful when responding to a single assignment creation.
   */
  function setViolations(key: RuleViolationKey, violations: RuleViolation[]): void {
    const next = new Map(registry.value)
    next.set(toKey(key), violations)
    registry.value = next
  }

  function getViolations(key: RuleViolationKey): RuleViolation[] {
    return registry.value.get(toKey(key)) ?? []
  }

  function hasBlocking(key: RuleViolationKey): boolean {
    return getViolations(key).some((v) => v.severity === 'BLOCKING')
  }

  function worstSeverity(key: RuleViolationKey): ViolationSeverity | null {
    const vs = getViolations(key)
    if (vs.some((v) => v.severity === 'BLOCKING')) return 'BLOCKING'
    if (vs.some((v) => v.severity === 'WARNING'))  return 'WARNING'
    if (vs.some((v) => v.severity === 'INFO'))     return 'INFO'
    return null
  }

  function clearCell(key: RuleViolationKey): void {
    const next = new Map(registry.value)
    next.delete(toKey(key))
    registry.value = next
  }

  function clearAll(): void {
    registry.value = new Map()
  }

  return {
    /** Read-only reference to the full registry (for advanced consumers). */
    registry,
    loadFromAssignments,
    setViolations,
    getViolations,
    hasBlocking,
    worstSeverity,
    clearCell,
    clearAll,
  }
}

import { describe, it, expect, beforeEach } from 'vitest'
import { useRuleViolations } from '@/features/schedule/composables/useRuleViolations'
import type { RuleViolation, RuleViolationKey } from '@/types'

function makeViolation(severity: RuleViolation['severity'], message = 'test'): RuleViolation {
  return {
    rule_id:     'r1',
    rule_type:   'MAX_HOURS',
    severity,
    message,
    shift_id:    's1',
    employee_id: 'e1',
  }
}

function key(shiftId: string, employeeId: string): RuleViolationKey {
  return { shiftId, employeeId }
}

describe('useRuleViolations', () => {
  let rv: ReturnType<typeof useRuleViolations>

  beforeEach(() => {
    rv = useRuleViolations()
    rv.clearAll()
  })

  it('returns empty array for unknown cell', () => {
    expect(rv.getViolations(key('shift-1', 'emp-1'))).toEqual([])
  })

  it('hasBlocking returns false for empty cell', () => {
    expect(rv.hasBlocking(key('shift-1', 'emp-1'))).toBe(false)
  })

  it('stores and retrieves violations by shiftId:employeeId key', () => {
    const vs = [makeViolation('BLOCKING', 'Over hours')]
    rv.setViolations(key('s1', 'e1'), vs)
    expect(rv.getViolations(key('s1', 'e1'))).toEqual(vs)
  })

  it('keys are isolated — different cells do not share violations', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('BLOCKING')])
    expect(rv.getViolations(key('s1', 'e2'))).toEqual([])
    expect(rv.getViolations(key('s2', 'e1'))).toEqual([])
  })

  it('hasBlocking returns true when BLOCKING violation present', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('BLOCKING')])
    expect(rv.hasBlocking(key('s1', 'e1'))).toBe(true)
  })

  it('hasBlocking returns false when only WARNING/INFO', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('WARNING'), makeViolation('INFO')])
    expect(rv.hasBlocking(key('s1', 'e1'))).toBe(false)
  })

  it('worstSeverity returns BLOCKING when present', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('INFO'), makeViolation('BLOCKING'), makeViolation('WARNING')])
    expect(rv.worstSeverity(key('s1', 'e1'))).toBe('BLOCKING')
  })

  it('worstSeverity returns WARNING when no BLOCKING', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('INFO'), makeViolation('WARNING')])
    expect(rv.worstSeverity(key('s1', 'e1'))).toBe('WARNING')
  })

  it('worstSeverity returns INFO when only INFO', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('INFO')])
    expect(rv.worstSeverity(key('s1', 'e1'))).toBe('INFO')
  })

  it('worstSeverity returns null for empty cell', () => {
    expect(rv.worstSeverity(key('s1', 'e1'))).toBeNull()
  })

  it('clearCell removes only that cell', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('BLOCKING')])
    rv.setViolations(key('s1', 'e2'), [makeViolation('WARNING')])
    rv.clearCell(key('s1', 'e1'))
    expect(rv.getViolations(key('s1', 'e1'))).toEqual([])
    expect(rv.getViolations(key('s1', 'e2'))).toHaveLength(1)
  })

  it('clearAll empties the entire registry', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('BLOCKING')])
    rv.setViolations(key('s2', 'e2'), [makeViolation('WARNING')])
    rv.clearAll()
    expect(rv.getViolations(key('s1', 'e1'))).toEqual([])
    expect(rv.getViolations(key('s2', 'e2'))).toEqual([])
  })

  it('overwriting a cell replaces violations', () => {
    rv.setViolations(key('s1', 'e1'), [makeViolation('BLOCKING')])
    rv.setViolations(key('s1', 'e1'), [makeViolation('WARNING')])
    expect(rv.getViolations(key('s1', 'e1'))).toHaveLength(1)
    expect(rv.getViolations(key('s1', 'e1'))[0].severity).toBe('WARNING')
  })
})

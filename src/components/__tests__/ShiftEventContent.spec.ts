import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ShiftEventContent from '@/features/schedule/components/ShiftEventContent.vue'
import { useRuleViolations } from '@/features/schedule/composables/useRuleViolations'
import type { RuleViolation, RuleViolationKey } from '@/types'

function makeEvent(shiftId: string, employeeId: string, title = 'NURSE', start?: Date, end?: Date) {
  return {
    title,
    start: start ?? new Date('2026-03-30T08:00:00'),
    end:   end   ?? new Date('2026-03-30T16:00:00'),
    extendedProps: { shiftId, employeeId },
    getResources: () => [],
  } as any
}

function makeViolation(severity: RuleViolation['severity'], message: string): RuleViolation {
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

describe('ShiftEventContent', () => {
  beforeEach(() => {
    useRuleViolations().clearAll()
  })

  it('renders event title', () => {
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1', 'NURSE') } })
    expect(wrapper.text()).toContain('NURSE')
  })

  it('renders time label from start/end', () => {
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    // jsdom may render 12h (08:00 AM / 04:00 PM) or 24h (08:00 / 16:00) depending on locale
    expect(wrapper.text()).toMatch(/08:00/)
    expect(wrapper.text()).toMatch(/(?:16:00|04:00\s*PM)/i)
  })

  it('shows no violation icon when no violations', () => {
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    expect(wrapper.find('.pi-ban').exists()).toBe(false)
    expect(wrapper.find('.pi-exclamation-triangle').exists()).toBe(false)
  })

  it('shows blocking icon (pi-ban) for BLOCKING violation', () => {
    useRuleViolations().setViolations(key('s1', 'e1'), [makeViolation('BLOCKING', 'Over hours')])
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    expect(wrapper.find('.pi-ban').exists()).toBe(true)
  })

  it('shows warning icon for WARNING violation', () => {
    useRuleViolations().setViolations(key('s1', 'e1'), [makeViolation('WARNING', 'Soft warning')])
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    expect(wrapper.find('.pi-exclamation-triangle').exists()).toBe(true)
  })

  it('shows info icon for INFO violation', () => {
    useRuleViolations().setViolations(key('s1', 'e1'), [makeViolation('INFO', 'Informational')])
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    expect(wrapper.find('.pi-info-circle').exists()).toBe(true)
  })

  it('violation icon title contains violation message', () => {
    useRuleViolations().setViolations(key('s1', 'e1'), [makeViolation('BLOCKING', 'Exceeds weekly limit')])
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    const icon = wrapper.find('[title]')
    expect(icon.attributes('title')).toContain('Exceeds weekly limit')
  })

  it('BLOCKING icon takes precedence over WARNING', () => {
    useRuleViolations().setViolations(key('s1', 'e1'), [
      makeViolation('WARNING', 'soft'),
      makeViolation('BLOCKING', 'hard'),
    ])
    const wrapper = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    expect(wrapper.find('.pi-ban').exists()).toBe(true)
    expect(wrapper.find('.pi-exclamation-triangle').exists()).toBe(false)
  })

  it('uses violations scoped to the correct cell key', () => {
    useRuleViolations().setViolations(key('s1', 'e1'), [makeViolation('BLOCKING', 'e1 violation')])
    useRuleViolations().setViolations(key('s1', 'e2'), [makeViolation('WARNING', 'e2 violation')])

    const wrapperE1 = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e1') } })
    const wrapperE2 = mount(ShiftEventContent, { props: { event: makeEvent('s1', 'e2') } })

    expect(wrapperE1.find('.pi-ban').exists()).toBe(true)
    expect(wrapperE2.find('.pi-exclamation-triangle').exists()).toBe(true)
  })
})

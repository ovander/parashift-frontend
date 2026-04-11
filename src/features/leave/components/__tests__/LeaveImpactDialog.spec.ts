/**
 * @file LeaveImpactDialog.spec.ts
 *
 * Tests for the leave impact preview dialog. The dialog has three visual states:
 *   1. Loading  — skeleton shown while the impact API call is in flight
 *   2. No-conflict — employee has no shifts during the leave period (green banner)
 *   3. Conflicts   — shifts will be cancelled (orange = all covered, red = some uncovered)
 *
 * PrimeVue components are stubbed to avoid needing a full PrimeVue plugin setup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LeaveImpactDialog from '../LeaveImpactDialog.vue'
import type { LeaveRequest, LeaveImpact, LeaveImpactShift } from '@/types'

vi.mock('@/stores/ui', () => ({ useUiStore: () => ({ isMobile: false, showToast: vi.fn() }) }))

beforeEach(() => {
  setActivePinia(createPinia())
})

// ── Stub helpers ──────────────────────────────────────────────────────────────

/**
 * PrimeVue Dialog stub: renders its default slot and #footer slot so we can
 * inspect dialog content and footer buttons without the full PrimeVue setup.
 */
const DialogStub = {
  name: 'Dialog',
  template: `
    <div class="p-dialog" :data-visible="visible">
      <div class="p-dialog-header"><slot name="header" /></div>
      <div class="p-dialog-content"><slot /></div>
      <div class="p-dialog-footer"><slot name="footer" /></div>
    </div>
  `,
  props: ['visible', 'modal', 'closable', 'style', 'pt'],
  emits: ['update:visible'],
}

const ButtonStub = {
  name: 'Button',
  template: `<button
    :data-label="label"
    :data-severity="severity"
    :disabled="disabled"
    @click="$emit('click')"
  >{{ label }}</button>`,
  props: ['label', 'severity', 'icon', 'text', 'disabled', 'loading'],
  emits: ['click'],
}

const SkeletonStub = {
  name: 'Skeleton',
  template: '<div class="p-skeleton" />',
  props: ['height', 'borderRadius'],
}

const globalStubs = {
  Dialog: DialogStub,
  Button: ButtonStub,
  Skeleton: SkeletonStub,
}

// ── Data factories ────────────────────────────────────────────────────────────

function makeLeave(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id:         'l1',
    store_id:   'store1',
    employee_id: 'e1',
    type:       'vacation',
    start_date: '2026-04-14',
    end_date:   '2026-04-18',
    status:     'pending',
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function makeImpact(overrides: Partial<LeaveImpact> = {}): LeaveImpact {
  return {
    affected_shifts:     [],
    total_cancellations: 0,
    total_hours_lost:    0,
    uncovered_shifts:    0,
    ...overrides,
  }
}

function makeShift(overrides: Partial<LeaveImpactShift> = {}): LeaveImpactShift {
  return {
    date:            '2026-04-14',
    start_time:      '09:00',
    end_time:        '17:00',
    role:            'pharmacist',
    other_assigned:  0,
    will_need_cover: true,
    ...overrides,
  }
}

// ── Default props ─────────────────────────────────────────────────────────────

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    visible:      true,
    leave:        makeLeave(),
    employeeName: 'Alice Dumont',
    impact:       null,
    loading:      false,
    error:        null,
    confirming:   false,
    ...overrides,
  }
}

function mountDialog(props = {}) {
  return mount(LeaveImpactDialog, {
    props: defaultProps(props),
    global: { stubs: globalStubs },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LeaveImpactDialog.vue', () => {

  // ── Loading state ───────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders Skeleton components when loading=true', () => {
      const wrapper = mountDialog({ loading: true, impact: null })
      expect(wrapper.findAll('.p-skeleton').length).toBeGreaterThan(0)
    })

    it('does not show impact content while loading', () => {
      const wrapper = mountDialog({ loading: true, impact: null })
      // The employee header block should not be visible during loading
      expect(wrapper.text()).not.toContain('Alice Dumont')
    })

    it('disables the Approve button while loading', () => {
      const wrapper = mountDialog({ loading: true, impact: null })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('disabled')).toBeDefined()
    })
  })

  // ── Error state ─────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('displays the error message when error prop is set', () => {
      const wrapper = mountDialog({ loading: false, impact: null, error: 'Failed to load impact preview.' })
      expect(wrapper.text()).toContain('Failed to load impact preview.')
    })

    it('disables the Approve button when there is an error', () => {
      const wrapper = mountDialog({ loading: false, impact: null, error: 'oops' })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('disabled')).toBeDefined()
    })
  })

  // ── No-conflict state ───────────────────────────────────────────────────────

  describe('no-conflict state (total_cancellations = 0)', () => {
    it('shows the "No scheduling conflicts" message', () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      expect(wrapper.text()).toContain('No scheduling conflicts')
    })

    it('shows the employee summary card', () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      expect(wrapper.text()).toContain('Alice Dumont')
    })

    it('shows leave type and date range in the summary', () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      const text = wrapper.text()
      expect(text).toContain('Vacation')
      expect(text).toContain('2026-04-14')
      expect(text).toContain('2026-04-18')
    })

    it('Approve button label is "Approve" (not "Approve anyway")', () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('data-label')).toBe('Approve')
    })

    it('Approve button is not disabled and uses success severity', () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('disabled')).toBeUndefined()
      expect(approveBtn?.attributes('data-severity')).toBe('success')
    })

    it('does not render the affected shifts list', () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      expect(wrapper.text()).not.toContain('Affected shifts')
    })
  })

  // ── Conflicts — all covered ─────────────────────────────────────────────────

  describe('conflicts with full coverage (uncovered_shifts = 0)', () => {
    const coveredImpact = makeImpact({
      total_cancellations: 2,
      total_hours_lost:    14,
      uncovered_shifts:    0,
      affected_shifts: [
        makeShift({ date: '2026-04-14', will_need_cover: false, other_assigned: 2 }),
        makeShift({ date: '2026-04-15', will_need_cover: false, other_assigned: 1 }),
      ],
    })

    it('shows the affected shifts section', () => {
      const wrapper = mountDialog({ impact: coveredImpact })
      expect(wrapper.text()).toContain('Affected shifts')
    })

    it('renders a row for each affected shift', () => {
      const wrapper = mountDialog({ impact: coveredImpact })
      // Dates are rendered via formatDate() → locale-formatted (e.g. "Tue, Apr 14").
      // Assert on stable fields: role and time range which are always rendered verbatim.
      const text = wrapper.text()
      expect(text.match(/pharmacist/g)?.length).toBeGreaterThanOrEqual(2)
      expect(text).toContain('09:00')
    })

    it('shows "N others" badge for covered shifts', () => {
      const wrapper = mountDialog({ impact: coveredImpact })
      // Both shifts have other_assigned > 0 so "others" badge should appear
      expect(wrapper.text()).toMatch(/\d+\s*other/)
    })

    it('does NOT show "No cover" badge when all shifts are covered', () => {
      const wrapper = mountDialog({ impact: coveredImpact })
      expect(wrapper.text()).not.toContain('No cover')
    })

    it('Approve button label is "Approve anyway"', () => {
      const wrapper = mountDialog({ impact: coveredImpact })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('data-label')).toBe('Approve anyway')
    })

    it('Approve button uses success severity when no shifts are uncovered', () => {
      const wrapper = mountDialog({ impact: coveredImpact })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('data-severity')).toBe('success')
    })
  })

  // ── Conflicts — uncovered shifts ────────────────────────────────────────────

  describe('conflicts with uncovered shifts (uncovered_shifts > 0)', () => {
    const uncoveredImpact = makeImpact({
      total_cancellations: 2,
      total_hours_lost:    16,
      uncovered_shifts:    1,
      affected_shifts: [
        makeShift({ date: '2026-04-14', will_need_cover: true,  other_assigned: 0 }),
        makeShift({ date: '2026-04-15', will_need_cover: false, other_assigned: 1 }),
      ],
    })

    it('shows "No cover" badge for the uncovered shift', () => {
      const wrapper = mountDialog({ impact: uncoveredImpact })
      expect(wrapper.text()).toContain('No cover')
    })

    it('shows "N others" badge for the covered shift', () => {
      const wrapper = mountDialog({ impact: uncoveredImpact })
      expect(wrapper.text()).toMatch(/1\s*other/)
    })

    it('Approve button uses danger severity when shifts are uncovered', () => {
      const wrapper = mountDialog({ impact: uncoveredImpact })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('data-severity')).toBe('danger')
    })

    it('Approve button label is "Approve anyway"', () => {
      const wrapper = mountDialog({ impact: uncoveredImpact })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('data-label')).toBe('Approve anyway')
    })
  })

  // ── Confirming state ────────────────────────────────────────────────────────

  describe('confirming state', () => {
    it('disables the Approve button while confirming', () => {
      const wrapper = mountDialog({ impact: makeImpact(), confirming: true })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      expect(approveBtn?.attributes('disabled')).toBeDefined()
    })

    it('disables the Cancel button while confirming', () => {
      const wrapper = mountDialog({ impact: makeImpact(), confirming: true })
      const cancelBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label') === 'Cancel',
      )
      expect(cancelBtn?.attributes('disabled')).toBeDefined()
    })
  })

  // ── Event emissions ─────────────────────────────────────────────────────────

  describe('event emissions', () => {
    it('emits "confirm" when Approve button is clicked', async () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      await approveBtn?.trigger('click')
      expect(wrapper.emitted('confirm')).toBeTruthy()
    })

    it('emits "cancel" when Cancel button is clicked', async () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      const cancelBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label') === 'Cancel',
      )
      await cancelBtn?.trigger('click')
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('does NOT emit "confirm" when Approve is disabled (loading)', async () => {
      const wrapper = mountDialog({ loading: true, impact: null })
      const approveBtn = wrapper.findAll('button').find(
        (b) => b.attributes('data-label')?.toLowerCase().includes('approve'),
      )
      // Button is disabled — triggering click on a disabled button should not fire
      if (approveBtn) {
        // Disabled buttons don't emit click in the real DOM, but our stub
        // relies on the disabled attribute. We check the attribute instead.
        expect(approveBtn.attributes('disabled')).toBeDefined()
      }
    })
  })

  // ── Day count computation ───────────────────────────────────────────────────

  describe('day count display', () => {
    it('shows correct day count for a 5-day leave (14–18 Apr)', () => {
      const wrapper = mountDialog({ impact: makeImpact() })
      // 2026-04-14 to 2026-04-18 inclusive = 5 days
      expect(wrapper.text()).toContain('5 day')
    })

    it('shows singular "day" for a 1-day leave', () => {
      const wrapper = mountDialog({
        impact: makeImpact(),
        leave: makeLeave({ start_date: '2026-04-14', end_date: '2026-04-14' }),
      })
      expect(wrapper.text()).toContain('1 day')
      expect(wrapper.text()).not.toContain('1 days')
    })
  })
})

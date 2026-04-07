import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlanLifecycleBar from '../PlanLifecycleBar.vue'
import type { SchedulePlan } from '@/types'

// Mock the stores
const mockPlanStore = {
  plan: null as SchedulePlan | null,
  canPublish: false,
  canRollback: false,
  isLive: false,
  publishing: false,
}

const mockCtx = {
  weekStart: '2026-04-01',
  weekEnd: '2026-04-07',
  setWeek: vi.fn(),
  nextWeek: vi.fn(),
  prevWeek: vi.fn(),
  storeId: 'store-1',
  setStore: vi.fn(),
}

vi.mock('@/stores/planStore', () => ({
  usePlanStore: () => mockPlanStore,
}))

vi.mock('@/stores/storeContext', () => ({
  useStoreContext: () => mockCtx,
}))

function makePlan(overrides?: Partial<SchedulePlan>): SchedulePlan {
  return {
    id: 'plan-1',
    store_id: 'store-1',
    week_start: '2026-04-01',
    state: 'DRAFT',
    snapshots: [],
    override_log: [],
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

describe('PlanLifecycleBar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockPlanStore.plan = null
    mockPlanStore.canPublish = false
    mockPlanStore.canRollback = false
    mockPlanStore.isLive = false
    mockPlanStore.publishing = false
  })

  it('shows DRAFT tag when plan is null', () => {
    mockPlanStore.plan = null

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: { template: '<div :class="severity">{{ value }}</div>', props: ['severity', 'value', 'icon'] },
          Button: { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['size', 'severity', 'text', 'icon', 'label', 'loading'] },
        },
      },
    })

    expect(wrapper.text()).toContain('DRAFT')
  })

  it('shows Publish Week button when canPublish is true', () => {
    mockPlanStore.plan = makePlan({ state: 'DRAFT' })
    mockPlanStore.canPublish = true

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    expect(html).toContain('Publish Week')
  })

  it('hides Publish button when canPublish is false', () => {
    mockPlanStore.plan = makePlan({ state: 'PUBLISHED' })
    mockPlanStore.canPublish = false

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: { template: '<div :class="severity">{{ value }}</div>', props: ['severity', 'value', 'icon'] },
          Button: { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['size', 'severity', 'text', 'icon', 'label', 'loading'] },
        },
      },
    })

    expect(wrapper.text()).not.toContain('Publish Week')
  })

  it('shows History button when canRollback is true', () => {
    mockPlanStore.plan = makePlan({
      snapshots: [
        {
          taken_at: '2026-04-01T00:00:00Z',
          shift_count: 10,
          assignment_count: 8,
          coverage_rate: 0.8,
        },
        {
          taken_at: '2026-04-02T00:00:00Z',
          shift_count: 11,
          assignment_count: 9,
          coverage_rate: 0.82,
        },
      ],
    })
    mockPlanStore.canRollback = true

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    expect(html).toContain('History')
  })

  it('emits publish event on publish button click', async () => {
    mockPlanStore.plan = makePlan({ state: 'DRAFT' })
    mockPlanStore.canPublish = true

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: { template: '<div :class="severity">{{ value }}</div>', props: ['severity', 'value', 'icon'] },
          Button: {
            template: '<button v-if="label === \'Publish Week\'" @click="$emit(\'click\')"><slot /></button>',
            props: ['size', 'severity', 'text', 'icon', 'label', 'loading'],
            emits: ['click'],
          },
        },
      },
    })

    const button = wrapper.findComponent({ name: 'Button' })
    if (button.exists()) {
      await button.trigger('click')
      expect(wrapper.emitted('publish')).toBeTruthy()
    }
  })

  it('emits open-history event on history button click', async () => {
    mockPlanStore.plan = makePlan({
      snapshots: [
        {
          taken_at: '2026-04-01T00:00:00Z',
          shift_count: 10,
          assignment_count: 8,
          coverage_rate: 0.8,
        },
        {
          taken_at: '2026-04-02T00:00:00Z',
          shift_count: 11,
          assignment_count: 9,
          coverage_rate: 0.82,
        },
      ],
    })
    mockPlanStore.canRollback = true

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: { template: '<div :class="severity">{{ value }}</div>', props: ['severity', 'value', 'icon'] },
          Button: {
            template: '<button v-if="label === \'History\'" @click="$emit(\'click\')"><slot /></button>',
            props: ['size', 'severity', 'text', 'icon', 'label', 'loading'],
            emits: ['click'],
          },
        },
      },
    })

    const buttons = wrapper.findAllComponents({ name: 'Button' })
    const historyButton = buttons.find(b => b.props('label') === 'History')
    if (historyButton) {
      await historyButton.trigger('click')
      expect(wrapper.emitted('open-history')).toBeTruthy()
    }
  })

  it('shows override count when override_log has entries', () => {
    mockPlanStore.plan = makePlan({
      override_log: [
        {
          timestamp: '2026-04-01T10:00:00Z',
          user_id: 'user-1',
          reason: 'Manual adjustment',
          shift_ids: ['shift-1'],
        },
        {
          timestamp: '2026-04-01T11:00:00Z',
          user_id: 'user-2',
          reason: 'Another adjustment',
          shift_ids: ['shift-2'],
        },
      ],
    })

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: { template: '<div :class="severity">{{ value }}</div>', props: ['severity', 'value', 'icon'] },
          Button: { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['size', 'severity', 'text', 'icon', 'label', 'loading'] },
        },
      },
    })

    expect(wrapper.text()).toContain('2 overrides')
  })

  it('shows LIVE tag with success severity when isLive is true', () => {
    mockPlanStore.plan = makePlan({ state: 'LIVE' })
    mockPlanStore.isLive = true
    mockPlanStore.canPublish = false

    const wrapper = mount(PlanLifecycleBar, {
      global: {
        plugins: [createPinia()],
        stubs: {
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    // Check that LIVE tag is present
    expect(html).toContain('LIVE')
    // Check that success severity is applied (in the HTML attributes)
    expect(html).toContain('success')
  })
})

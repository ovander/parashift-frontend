import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRulesStore } from '@/features/rules/stores/rulesStore'
import type { Rule } from '@/types'

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'r1', store_id: 'store1', rule_type: 'MAX_HOURS', severity: 'BLOCKING',
    description: 'Max 40h per week', configuration: { max_weekly_hours: 40 },
    is_enabled: true, created_at: '', updated_at: '',
    ...overrides,
  }
}

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({
  default: { get: mockGet, post: mockPost, put: mockPut, delete: mockDelete },
}))
vi.mock('@/stores/ui', () => ({
  useUiStore: () => ({ showToast: vi.fn(), setLoading: vi.fn() }),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('rulesStore', () => {
  describe('fetchRules', () => {
    it('populates rules from API', async () => {
      const store = useRulesStore()
      mockGet.mockResolvedValue({ data: [makeRule()] })
      await store.fetchRules('store1')
      expect(store.rules).toHaveLength(1)
      expect(store.rules[0].rule_type).toBe('MAX_HOURS')
    })

    it('handles empty list', async () => {
      const store = useRulesStore()
      mockGet.mockResolvedValue({ data: [] })
      await store.fetchRules('store1')
      expect(store.rules).toEqual([])
    })
  })

  describe('createRule', () => {
    it('appends new rule to local list', async () => {
      const store = useRulesStore()
      const newRule = makeRule({ id: 'r-new' })
      mockPost.mockResolvedValue({ data: newRule })

      await store.createRule('store1', { rule_type: 'MAX_HOURS', severity: 'BLOCKING', description: 'Test', configuration: {}, is_enabled: true })
      expect(store.rules.find((r) => r.id === 'r-new')).toBeDefined()
    })

    it('marks dirty.clean after successful create', async () => {
      const store = useRulesStore()
      mockPost.mockResolvedValue({ data: makeRule() })
      await store.createRule('store1', { rule_type: 'MAX_HOURS', severity: 'BLOCKING', description: 'T', configuration: {}, is_enabled: true })
      expect(store.dirty.state).toBe('clean')
    })

    it('marks dirty.error on API failure', async () => {
      const store = useRulesStore()
      mockPost.mockRejectedValue({ message: 'Server error' })
      await expect(store.createRule('store1', { rule_type: 'MAX_HOURS', severity: 'BLOCKING', description: 'T', configuration: {}, is_enabled: true }))
        .rejects.toBeDefined()
      expect(store.dirty.state).toBe('error')
    })
  })

  describe('updateRule', () => {
    it('replaces rule in list with server response', async () => {
      const store = useRulesStore()
      store.rules = [makeRule({ description: 'Old desc' })]
      const updated = makeRule({ description: 'New desc' })
      mockPut.mockResolvedValue({ data: updated })

      await store.updateRule('store1', 'r1', { description: 'New desc' })
      expect(store.rules[0].description).toBe('New desc')
    })
  })

  describe('toggleEnabled', () => {
    it('flips is_enabled from true to false', async () => {
      const store = useRulesStore()
      store.rules = [makeRule({ is_enabled: true })]
      const toggled = makeRule({ is_enabled: false })
      mockPut.mockResolvedValue({ data: toggled })

      await store.toggleEnabled('store1', 'r1')
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining('r1'),
        expect.objectContaining({ is_enabled: false }),
      )
    })

    it('flips is_enabled from false to true', async () => {
      const store = useRulesStore()
      store.rules = [makeRule({ is_enabled: false })]
      const toggled = makeRule({ is_enabled: true })
      mockPut.mockResolvedValue({ data: toggled })

      await store.toggleEnabled('store1', 'r1')
      expect(mockPut).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ is_enabled: true }),
      )
    })

    it('does nothing if rule not found', async () => {
      const store = useRulesStore()
      store.rules = []
      await store.toggleEnabled('store1', 'nonexistent')
      expect(mockPut).not.toHaveBeenCalled()
    })
  })

  describe('deleteRule', () => {
    it('removes rule from local list', async () => {
      const store = useRulesStore()
      store.rules = [makeRule({ id: 'r1' }), makeRule({ id: 'r2' })]
      mockDelete.mockResolvedValue({})

      await store.deleteRule('store1', 'r1')
      expect(store.rules.find((r) => r.id === 'r1')).toBeUndefined()
      expect(store.rules.find((r) => r.id === 'r2')).toBeDefined()
    })

    it('does not remove rule on API error', async () => {
      const store = useRulesStore()
      store.rules = [makeRule({ id: 'r1' })]
      mockDelete.mockRejectedValue(new Error('Forbidden'))

      await expect(store.deleteRule('store1', 'r1')).rejects.toBeDefined()
      expect(store.rules).toHaveLength(1)
    })
  })
})

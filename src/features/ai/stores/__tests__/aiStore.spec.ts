import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAIStore } from '@/features/ai/stores/aiStore'
import type { ScheduleSuggestion, AIInsight } from '@/types'

const mockAIApi = { get: vi.fn(), post: vi.fn(), delete: vi.fn() }
vi.mock('@/composables/useApi', () => ({
  useAIApi: () => mockAIApi,
  default: { get: vi.fn() },
}))
vi.mock('@/features/schedule/stores/scheduleStore', () => ({
  useScheduleStore: () => ({ shifts: [{ id: 's1' }], assignments: [], fetchWeek: vi.fn() }),
}))
vi.mock('@/features/coverage/stores/coverageStore', () => ({
  useCoverageStore: () => ({ coverage: { gaps: 2 } }),
}))
vi.mock('@/features/employees/stores/employeeStore', () => ({
  useEmployeeStore: () => ({ employees: [{ id: 'e1' }], fetchEmployees: vi.fn() }),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('aiStore', () => {
  describe('fetchSuggestions', () => {
    it('populates suggestions on success', async () => {
      const store = useAIStore()
      const suggestions: ScheduleSuggestion[] = [
        { employee_id: 'e1', employee: { id: 'e1', name: 'Alice' } as any, confidence: 0.9, reason: 'Best match', score: 95 },
      ]
      mockAIApi.get.mockResolvedValue({ data: { data: suggestions } })

      await store.fetchSuggestions('store1', 's1')
      expect(store.suggestions).toHaveLength(1)
      expect(store.suggestions[0].confidence).toBe(0.9)
    })

    it('sets loadingSuggest during fetch', async () => {
      const store = useAIStore()
      let capturedLoading = false
      mockAIApi.get.mockImplementation(() => {
        capturedLoading = store.loadingSuggest
        return Promise.resolve({ data: { data: [] } })
      })
      await store.fetchSuggestions('store1', 's1')
      expect(capturedLoading).toBe(true)
      expect(store.loadingSuggest).toBe(false)
    })

    it('sets errorSuggest on failure', async () => {
      const store = useAIStore()
      mockAIApi.get.mockRejectedValue({ message: 'LLM timeout' })
      await store.fetchSuggestions('store1', 's1')
      expect(store.errorSuggest).toBeTruthy()
      expect(store.suggestions).toHaveLength(0)
    })

    it('clears previous suggestions before new fetch', async () => {
      const store = useAIStore()
      store.suggestions = [{ employee_id: 'old' } as any]
      mockAIApi.get.mockResolvedValue({ data: { data: [] } })
      await store.fetchSuggestions('store1', 's1')
      expect(store.suggestions).toHaveLength(0)
    })
  })

  describe('fetchInsights', () => {
    it('populates insights on success', async () => {
      const store = useAIStore()
      const insights: AIInsight[] = [{
        id: 'i1', type: 'COVERAGE', message: 'Gap on Monday', recommendation: 'Add staff',
        confidence: 0.85, created_at: '',
      }]
      mockAIApi.get.mockResolvedValue({ data: { data: insights } })
      await store.fetchInsights('store1')
      expect(store.insights).toHaveLength(1)
      expect(store.insights[0].type).toBe('COVERAGE')
    })

    it('sets errorInsights on failure', async () => {
      const store = useAIStore()
      mockAIApi.get.mockRejectedValue({ message: 'Server error' })
      await store.fetchInsights('store1')
      expect(store.errorInsights).toBeTruthy()
    })
  })

  describe('dismissInsight', () => {
    it('removes insight from list', async () => {
      const store = useAIStore()
      store.insights = [
        { id: 'i1', type: 'COVERAGE', message: '', recommendation: '', confidence: 0.5, created_at: '' },
        { id: 'i2', type: 'REST',     message: '', recommendation: '', confidence: 0.5, created_at: '' },
      ]
      mockAIApi.delete.mockResolvedValue({})
      await store.dismissInsight('store1', 'i1')
      expect(store.insights.find((i) => i.id === 'i1')).toBeUndefined()
      expect(store.insights.find((i) => i.id === 'i2')).toBeDefined()
    })
  })
})

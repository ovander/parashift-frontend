import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSwapStore } from '@/features/swap/stores/swapStore'
import type { SwapRequest } from '@/types'

function makeSwap(overrides: Partial<SwapRequest> = {}): SwapRequest {
  return {
    id: 'sw1', tenant_id: 'store1', requester_id: 'e1', target_employee_id: 'e2',
    shift_instance_id: 's1', status: 'pending', created_at: '', updated_at: '',
    ...overrides,
  }
}

const { mockGet, mockPost, mockPut, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({
  default: { get: mockGet, post: mockPost, put: mockPut, patch: mockPatch },
}))
vi.mock('@/stores/ui', () => ({ useUiStore: () => ({ showToast: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'e2', role: 'employee' } }),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('swapStore', () => {
  describe('fetchSwaps', () => {
    it('loads swap requests', async () => {
      const store = useSwapStore()
      mockGet.mockResolvedValue({ data: { data: [makeSwap()] } })
      await store.fetchSwaps('store1')
      expect(store.swaps).toHaveLength(1)
    })
  })

  describe('pendingIncoming', () => {
    it('returns swaps where current user is target and status is pending', () => {
      const store = useSwapStore()
      store.swaps = [
        makeSwap({ id: 'sw1', target_employee_id: 'e2', status: 'pending' }),   // current user
        makeSwap({ id: 'sw2', target_employee_id: 'e3', status: 'pending' }),   // different target
        makeSwap({ id: 'sw3', target_employee_id: 'e2', status: 'accepted' }),  // already accepted
      ]
      const incoming = store.pendingIncoming
      expect(incoming).toHaveLength(1)
      expect(incoming[0].id).toBe('sw1')
    })

    it('returns empty array when no pending incoming swaps', () => {
      const store = useSwapStore()
      store.swaps = [makeSwap({ target_employee_id: 'other', status: 'pending' })]
      expect(store.pendingIncoming).toHaveLength(0)
    })
  })

  describe('createSwap', () => {
    it('appends swap to list', async () => {
      const store = useSwapStore()
      mockPost.mockResolvedValue({ data: makeSwap({ id: 'sw-new' }) })
      await store.createSwap('store1', { shift_instance_id: 's1', target_employee_id: 'e2' })
      expect(store.swaps.find((s) => s.id === 'sw-new')).toBeDefined()
    })
  })

  describe('respondToSwap', () => {
    it('accepts: updates status in list', async () => {
      const store = useSwapStore()
      store.swaps = [makeSwap({ id: 'sw1', status: 'pending' })]
      mockPut.mockResolvedValue({ data: makeSwap({ id: 'sw1', status: 'accepted' }) })
      await store.respondToSwap('store1', 'sw1', 'accept')
      expect(store.swaps[0].status).toBe('accepted')
    })

    it('decline: updates status in list', async () => {
      const store = useSwapStore()
      store.swaps = [makeSwap({ id: 'sw1', status: 'pending' })]
      mockPut.mockResolvedValue({ data: makeSwap({ id: 'sw1', status: 'rejected' }) })
      await store.respondToSwap('store1', 'sw1', 'decline')
      expect(store.swaps[0].status).toBe('rejected')
    })

    it('passes correct action to API', async () => {
      const store = useSwapStore()
      store.swaps = [makeSwap({ id: 'sw1' })]
      mockPut.mockResolvedValue({ data: makeSwap({ id: 'sw1', status: 'accepted' }) })
      await store.respondToSwap('store1', 'sw1', 'accept')
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining('sw1'),
        { status: 'accepted' },
      )
    })
  })
})

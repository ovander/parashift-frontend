/**
 * Sprint 1 T1.4 — i18n section tests for storeConfigStore
 *
 * Verifies that:
 * 1. Successful actions call showToast with t() keys, not raw strings
 * 2. Error paths call showToast with the correct error key
 * 3. No hardcoded French/English strings are passed to the toast service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoist mocks (vi.mock is hoisted to the top of the file) ──────────────────
const { mockApiGet, mockApiPut, mockApiPost, mockApiDelete, mockShowToast } = vi.hoisted(() => ({
  mockApiGet:    vi.fn(),
  mockApiPut:    vi.fn(),
  mockApiPost:   vi.fn(),
  mockApiDelete: vi.fn(),
  mockShowToast: vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({
  default: {
    get:    mockApiGet,
    put:    mockApiPut,
    post:   mockApiPost,
    delete: mockApiDelete,
  },
}))

vi.mock('@/stores/ui', () => ({
  useUiStore: () => ({ showToast: mockShowToast }),
}))

// vue-i18n: return the key itself so we can assert key names in toast calls.
vi.mock('vue-i18n', async (importOriginal) => {
  const mod = await importOriginal<typeof import('vue-i18n')>()
  return { ...mod, useI18n: () => ({ t: (key: string) => key, locale: { value: 'en' } }) }
})

// ── Import store AFTER mocks ──────────────────────────────────────────────────
import { useStoreConfigStore } from '@/features/config/stores/storeConfigStore'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('storeConfigStore — i18n compliance', () => {
  it('saveOpeningHours: success toast uses t() key, not a raw string', async () => {
    mockApiPut.mockResolvedValue({ data: {} })

    const store = useStoreConfigStore()
    await store.saveOpeningHours([{ day_of_week: 1, open_time: '08:00', close_time: '18:00' }])

    expect(mockShowToast).toHaveBeenCalledWith(
      'success',
      'common.saved',          // t('common.saved')
      'config.openingHours.saved', // t('config.openingHours.saved')
    )
    // Ensure no raw French or English strings leaked through
    const callArgs = mockShowToast.mock.calls[0]
    expect(callArgs[1]).not.toContain('Saved')
    expect(callArgs[1]).not.toContain('Enregistré')
  })

  it('saveOpeningHours: error toast uses t() key, not a raw string', async () => {
    mockApiPut.mockRejectedValue({
      response: { data: { error: { key: 'errors.unknown' } } },
    })

    const store = useStoreConfigStore()
    await store.saveOpeningHours([])

    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'common.error', // t('common.error')
      expect.any(String),
    )
    const callArgs = mockShowToast.mock.calls[0]
    expect(callArgs[1]).not.toContain('Erreur')
    expect(callArgs[1]).not.toContain('Error')
  })

  it('createRequirement: success toast uses config.coverage.added key', async () => {
    const mockReq = { id: 'r1', day_of_week: 1, start_time: '08:00', end_time: '16:00', min_staff: 2, required_role: 'cashier' }
    mockApiPost.mockResolvedValue({ data: mockReq })

    const store = useStoreConfigStore()
    await store.createRequirement('store-1', {
      day_of_week: 1, start_time: '08:00', end_time: '16:00', min_staff: 2, required_role: 'cashier',
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'success',
      'common.added',
      'config.coverage.added',
    )
  })

  it('deleteRequirement: success toast uses config.coverage.deleted key', async () => {
    mockApiDelete.mockResolvedValue({})

    const store = useStoreConfigStore()
    // Pre-populate store to avoid index error
    ;(store as any).requirements = [{ id: 'r1' }]
    await store.deleteRequirement('store-1', 'r1')

    expect(mockShowToast).toHaveBeenCalledWith(
      'success',
      'common.deleted',
      'config.coverage.deleted',
    )
  })
})

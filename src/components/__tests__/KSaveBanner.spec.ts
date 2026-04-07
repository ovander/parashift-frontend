import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import KSaveBanner from '@/components/KSaveBanner.vue'
import type { DirtyStateHandle, DirtyState } from '@/composables/useDirtyState'

function makeDirty(state: DirtyState, errorMsg = ''): DirtyStateHandle {
  const stateRef = ref<DirtyState>(state)
  const errRef   = ref(errorMsg)
  return {
    state:        stateRef as any,
    isDirty:      ref(state === 'dirty') as any,
    hasError:     ref(state === 'error') as any,
    isSaving:     ref(state === 'saving') as any,
    errorMessage: errRef as any,
    markDirty:  () => { stateRef.value = 'dirty' },
    markSaving: () => { stateRef.value = 'saving' },
    markClean:  () => { stateRef.value = 'clean' },
    markError:  (m = '') => { stateRef.value = 'error'; errRef.value = m },
    reset:      () => { stateRef.value = 'clean' },
  }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('KSaveBanner', () => {
  it('is hidden when state is clean (before auto-fade)', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('clean') } })
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('shows "Unsaved changes" when dirty', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('dirty') } })
    expect(wrapper.text()).toContain('Unsaved changes')
  })

  it('shows "Saving…" when saving', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('saving') } })
    expect(wrapper.text()).toContain('Saving')
  })

  it('shows error message when in error state', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('error', 'Network timeout') } })
    expect(wrapper.text()).toContain('Network timeout')
  })

  it('shows default error message when none provided', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('error', '') } })
    expect(wrapper.text()).toMatch(/not saved/i)
  })

  it('shows "Saved" briefly when transitioning to clean', async () => {
    const dirty = makeDirty('dirty')
    const wrapper = mount(KSaveBanner, { props: { dirty } })
    dirty.markClean()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Saved')
  })

  it('auto-fades after 3s when clean', async () => {
    const dirty = makeDirty('dirty')
    const wrapper = mount(KSaveBanner, { props: { dirty } })
    dirty.markClean()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('div').exists()).toBe(true)   // visible immediately
    vi.advanceTimersByTime(3_001)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('div').exists()).toBe(false)  // faded
  })

  it('is hidden when loading=true regardless of state', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('dirty'), loading: true } })
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('applies amber class when dirty', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('dirty') } })
    expect(wrapper.find('div').classes().join(' ')).toMatch(/amber/)
  })

  it('applies red class when error', () => {
    const wrapper = mount(KSaveBanner, { props: { dirty: makeDirty('error') } })
    expect(wrapper.find('div').classes().join(' ')).toMatch(/red/)
  })

  it('applies green class when showing clean', async () => {
    const dirty = makeDirty('dirty')
    const wrapper = mount(KSaveBanner, { props: { dirty } })
    dirty.markClean()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('div').classes().join(' ')).toMatch(/green/)
  })
})

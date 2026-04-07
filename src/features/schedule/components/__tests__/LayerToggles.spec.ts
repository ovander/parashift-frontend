import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import LayerToggles from '../LayerToggles.vue'
import { usePlannerLayers } from '../../composables/usePlannerLayers'

describe('LayerToggles.vue', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset the layer state to defaults
    const { setLayer } = usePlannerLayers()
    setLayer('ai', false)
    setLayer('coverage', true)
    setLayer('violations', true)
  })

  it('renders 4 layer buttons', () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(4)
  })

  it('core button is disabled', () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
  })

  it('coverage button is enabled and clickable', () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')
    const coverageButton = buttons[1]
    expect(coverageButton.attributes('disabled')).not.toBeDefined()
  })

  it('ai button starts inactive', () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')
    const aiButton = buttons[3]
    expect(aiButton.classes()).not.toContain('bg-brand-500')
  })

  it('clicking coverage toggles its active state', async () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')
    const coverageButton = buttons[1]

    // Initially active (has brand background)
    expect(coverageButton.classes('bg-brand-500')).toBe(true)

    // Click to toggle
    await coverageButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Now should be inactive
    const updatedButtons = wrapper.findAll('button')
    expect(updatedButtons[1].classes('bg-brand-500')).toBe(false)
  })

  it('clicking core does nothing (stays active)', async () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')
    const coreButton = buttons[0]

    // Initially active (has brand background)
    expect(coreButton.classes('bg-brand-500')).toBe(true)

    // Click (should do nothing)
    await coreButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Still active
    const updatedButtons = wrapper.findAll('button')
    expect(updatedButtons[0].classes('bg-brand-500')).toBe(true)
  })

  it('active layers have brand styling class', () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')

    // Core, coverage, and violations are active by default - check they have brand-500 class
    expect(buttons[0].element.className).toContain('bg-brand-500')
    expect(buttons[1].element.className).toContain('bg-brand-500')
    expect(buttons[2].element.className).toContain('bg-brand-500')
  })

  it('inactive layers have gray styling class', async () => {
    const wrapper = mount(LayerToggles, {
      global: {
        plugins: [createPinia()],
      },
    })

    const buttons = wrapper.findAll('button')

    // AI is inactive by default
    const aiButton = buttons[3]
    expect(aiButton.classes('text-gray-500')).toBe(true)
    expect(aiButton.classes('hover:bg-gray-100')).toBe(true)
  })
})

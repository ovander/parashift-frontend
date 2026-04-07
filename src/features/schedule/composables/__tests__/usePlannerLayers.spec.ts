import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { usePlannerLayers } from '@/features/schedule/composables/usePlannerLayers'

describe('usePlannerLayers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('core layer is active by default', () => {
    const { isActive } = usePlannerLayers()
    expect(isActive('core')).toBe(true)
  })

  it('coverage layer is active by default', () => {
    const { isActive } = usePlannerLayers()
    expect(isActive('coverage')).toBe(true)
  })

  it('violations layer is active by default', () => {
    const { isActive } = usePlannerLayers()
    expect(isActive('violations')).toBe(true)
  })

  it('ai layer is inactive by default', () => {
    const { isActive } = usePlannerLayers()
    expect(isActive('ai')).toBe(false)
  })

  it('toggle disables coverage layer', () => {
    const { toggle, isActive } = usePlannerLayers()
    expect(isActive('coverage')).toBe(true)
    toggle('coverage')
    expect(isActive('coverage')).toBe(false)
  })

  it('toggle re-enables coverage layer', () => {
    const { toggle, isActive, setLayer } = usePlannerLayers()
    // Reset to known state
    setLayer('coverage', true)
    // First toggle disables
    toggle('coverage')
    expect(isActive('coverage')).toBe(false)
    // Second toggle re-enables
    toggle('coverage')
    expect(isActive('coverage')).toBe(true)
  })

  it('toggle on core does nothing (core is always on)', () => {
    const { toggle, isActive } = usePlannerLayers()
    // Try to toggle core
    toggle('core')
    expect(isActive('core')).toBe(true)
    // Try again
    toggle('core')
    expect(isActive('core')).toBe(true)
  })

  it('setLayer enables ai layer', () => {
    const { setLayer, isActive } = usePlannerLayers()
    expect(isActive('ai')).toBe(false)
    setLayer('ai', true)
    expect(isActive('ai')).toBe(true)
  })

  it('setLayer disables violations layer', () => {
    const { setLayer, isActive } = usePlannerLayers()
    expect(isActive('violations')).toBe(true)
    setLayer('violations', false)
    expect(isActive('violations')).toBe(false)
  })

  it('setLayer on core does nothing', () => {
    const { setLayer, isActive } = usePlannerLayers()
    setLayer('core', false)
    expect(isActive('core')).toBe(true)
  })

  it('isActive returns correct value for each layer', () => {
    const { isActive, setLayer } = usePlannerLayers()
    // Reset to clean defaults
    setLayer('coverage', true)
    setLayer('violations', true)
    setLayer('ai', false)

    expect(isActive('core')).toBe(true)
    expect(isActive('coverage')).toBe(true)
    expect(isActive('violations')).toBe(true)
    expect(isActive('ai')).toBe(false)
  })

  it('state persists to localStorage on change', async () => {
    const { toggle, layers } = usePlannerLayers()
    toggle('coverage')

    // The watch is deep, so we need to wait for Vue to process it
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const stored = localStorage.getItem('parashift:planner-layers')
    expect(stored).toBeTruthy()
    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.coverage).toBe(false)
      expect(parsed.core).toBe(true)
    }
  })

  it('accepts layer state updates correctly', () => {
    const { setLayer, isActive, toggle } = usePlannerLayers()

    // Reset to clean state first
    setLayer('ai', false)
    setLayer('violations', true)
    setLayer('coverage', true)

    // Multiple operations
    setLayer('ai', true)
    expect(isActive('ai')).toBe(true)

    toggle('violations')
    expect(isActive('violations')).toBe(false)

    setLayer('coverage', false)
    expect(isActive('coverage')).toBe(false)

    // Core should still be on
    expect(isActive('core')).toBe(true)
  })

  it('handles invalid layer names gracefully', () => {
    const { isActive } = usePlannerLayers()
    // Should not throw, just return false or handle gracefully
    expect(() => {
      isActive('invalid' as any)
    }).not.toThrow()
  })
})

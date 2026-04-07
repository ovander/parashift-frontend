import { describe, it, expect, beforeEach } from 'vitest'
import { useDirtyState, getDirtyModules } from '@/composables/useDirtyState'

// Each test uses a unique key to avoid shared registry pollution
let key: string
let counter = 0
beforeEach(() => { key = `test-module-${counter++}` })

describe('useDirtyState', () => {
  it('starts in clean state', () => {
    const dirty = useDirtyState(key)
    expect(dirty.state.value).toBe('clean')
    expect(dirty.isDirty.value).toBe(false)
    expect(dirty.hasError.value).toBe(false)
    expect(dirty.isSaving.value).toBe(false)
  })

  it('transitions: clean → dirty → saving → clean', () => {
    const dirty = useDirtyState(key)
    dirty.markDirty()
    expect(dirty.state.value).toBe('dirty')
    expect(dirty.isDirty.value).toBe(true)

    dirty.markSaving()
    expect(dirty.state.value).toBe('saving')
    expect(dirty.isSaving.value).toBe(true)

    dirty.markClean()
    expect(dirty.state.value).toBe('clean')
    expect(dirty.isDirty.value).toBe(false)
    expect(dirty.isSaving.value).toBe(false)
  })

  it('transitions: dirty → error with message', () => {
    const dirty = useDirtyState(key)
    dirty.markDirty()
    dirty.markError('Network timeout')
    expect(dirty.state.value).toBe('error')
    expect(dirty.hasError.value).toBe(true)
    expect(dirty.errorMessage.value).toBe('Network timeout')
  })

  it('markDirty is a no-op during saving', () => {
    const dirty = useDirtyState(key)
    dirty.markSaving()
    dirty.markDirty()                   // should be ignored
    expect(dirty.state.value).toBe('saving')
  })

  it('markClean resets errorMessage', () => {
    const dirty = useDirtyState(key)
    dirty.markError('Something failed')
    dirty.markClean()
    expect(dirty.errorMessage.value).toBe('')
  })

  it('uses default error message when none provided', () => {
    const dirty = useDirtyState(key)
    dirty.markError()
    expect(dirty.errorMessage.value).toContain('not saved')
  })

  it('reset returns to clean with empty message', () => {
    const dirty = useDirtyState(key)
    dirty.markError('oops')
    dirty.reset()
    expect(dirty.state.value).toBe('clean')
    expect(dirty.errorMessage.value).toBe('')
  })

  it('two handles sharing the same key share state', () => {
    const a = useDirtyState(key)
    const b = useDirtyState(key)
    a.markDirty()
    expect(b.state.value).toBe('dirty')
  })

  it('getDirtyModules returns all dirty/errored keys', () => {
    const k1 = `gd-${counter++}`
    const k2 = `gd-${counter++}`
    const k3 = `gd-${counter++}`
    useDirtyState(k1).markDirty()
    useDirtyState(k2).markError()
    useDirtyState(k3).markClean()
    const modules = getDirtyModules()
    expect(modules).toContain(k1)
    expect(modules).toContain(k2)
    expect(modules).not.toContain(k3)
  })
})

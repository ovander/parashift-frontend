import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStoreContext } from '@/stores/storeContext'

beforeEach(() => { setActivePinia(createPinia()) })

function mondayOf(isoDate: string): string {
  const d = new Date(isoDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

describe('storeContext', () => {
  it('initialises weekStart to current ISO Monday', () => {
    const ctx = useStoreContext()
    const today = new Date().toISOString().split('T')[0]
    expect(ctx.weekStart).toBe(mondayOf(today))
  })

  it('weekEnd is 6 days after weekStart', () => {
    const ctx = useStoreContext()
    ctx.setWeek('2026-03-30')
    expect(ctx.weekEnd).toBe('2026-04-05')
  })

  it('nextWeek advances weekStart by 7 days', () => {
    const ctx = useStoreContext()
    ctx.setWeek('2026-03-30')
    ctx.nextWeek()
    expect(ctx.weekStart).toBe('2026-04-06')
  })

  it('prevWeek moves weekStart back 7 days', () => {
    const ctx = useStoreContext()
    ctx.setWeek('2026-03-30')
    ctx.prevWeek()
    expect(ctx.weekStart).toBe('2026-03-23')
  })

  it('prevWeek after nextWeek returns to original', () => {
    const ctx = useStoreContext()
    ctx.setWeek('2026-03-30')
    ctx.nextWeek()
    ctx.prevWeek()
    expect(ctx.weekStart).toBe('2026-03-30')
  })

  it('setStore updates storeId', () => {
    const ctx = useStoreContext()
    ctx.setStore('my-store-id')
    expect(ctx.storeId).toBe('my-store-id')
  })

  it('multiple nextWeek calls accumulate correctly', () => {
    const ctx = useStoreContext()
    ctx.setWeek('2026-03-30')
    ctx.nextWeek()
    ctx.nextWeek()
    ctx.nextWeek()
    expect(ctx.weekStart).toBe('2026-04-20')
  })
})

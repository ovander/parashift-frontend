import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

// ── Global vue-i18n mock ──────────────────────────────────────────────────────
//
// Wraps `useI18n` with a try-catch so it works in TWO contexts:
//
//   1. Inside component setup (has i18n plugin via config.global.plugins) →
//      the try block succeeds and returns the REAL i18n with full translations.
//
//   2. Inside Pinia store setup functions called from standalone Pinia tests
//      (no Vue app context) → `getCurrentInstance()` returns null, vue-i18n
//      throws, and the catch block returns a minimal mock so stores can be
//      created without blowing up.
//
// All other exports (createI18n, createI18nFactory, …) are passed through from
// the real module so that code like `i18n.ts` that calls `createI18n()` works.
vi.mock('vue-i18n', async (importOriginal) => {
  const mod = await importOriginal<typeof import('vue-i18n')>()
  const originalUseI18n = mod.useI18n
  return {
    ...mod,
    useI18n: (...args: Parameters<typeof originalUseI18n>) => {
      try {
        return originalUseI18n(...args)
      } catch {
        // Fallback for Pinia store tests without a Vue app context.
        return {
          t:      (key: string) => key,
          te:     (_key: string) => false,
          d:      (v: unknown) => String(v),
          n:      (v: unknown) => String(v),
          locale: { value: 'en' },
        }
      }
    },
  }
})

// ── i18n plugin for component tests ──────────────────────────────────────────
//
// Any component that calls `const { t } = useI18n()` requires the vue-i18n
// plugin to be installed in the Vue app.  Without it, useI18n() warns and
// returns a fallback that ignores translations, breaking string assertions.
//
// We build a minimal i18n instance with all EN locale files pre-loaded so that
// `t('common.save')` returns 'Save' (not the key), keeping component tests
// readable and matching the real production behaviour.
//
// The instance is added to config.global.plugins so every `mount()` call gets
// it automatically.  Tests that create their own i18n (e.g. useLocale.spec.ts
// via withSetup) are unaffected because withSetup() builds its own createApp().

import enCommon   from '@/locales/en/common.json'
import enNav      from '@/locales/en/nav.json'
import enAuth     from '@/locales/en/auth.json'
import enSchedule from '@/locales/en/schedule.json'
import enAdmin    from '@/locales/en/admin.json'
import enManager  from '@/locales/en/manager.json'
import enEmployee from '@/locales/en/employee.json'
import enLeave    from '@/locales/en/leave.json'
import enSwap     from '@/locales/en/swap.json'
import enRules    from '@/locales/en/rules.json'
import enAi       from '@/locales/en/ai.json'
import enCoverage from '@/locales/en/coverage.json'
import enErrors   from '@/locales/en/errors.json'
import enConfig   from '@/locales/en/config.json'

const testI18n = createI18n({
  legacy:         false,   // Composition API mode — same as the production plugin
  locale:         'en',
  fallbackLocale: 'en',
  // Silence "missing key" warnings in tests — we don't need them
  missing: () => undefined,
  messages: {
    en: {
      common:   enCommon,
      nav:      enNav,
      auth:     enAuth,
      schedule: enSchedule,
      admin:    enAdmin,
      manager:  enManager,
      employee: enEmployee,
      leave:    enLeave,
      swap:     enSwap,
      rules:    enRules,
      ai:       enAi,
      coverage: enCoverage,
      errors:   enErrors,
      config:   enConfig,
    },
  },
})

config.global.plugins = [testI18n]

// ── localStorage stub ─────────────────────────────────────────────────────────
const _localStore: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem:    (k: string) => _localStore[k] ?? null,
    setItem:    (k: string, v: string) => { _localStore[k] = String(v) },
    removeItem: (k: string) => { delete _localStore[k] },
    clear:      () => { Object.keys(_localStore).forEach((k) => delete _localStore[k]) },
    key:        (i: number) => Object.keys(_localStore)[i] ?? null,
    get length() { return Object.keys(_localStore).length },
  },
  writable: true,
})

// Mock PrimeVue directives
config.global.directives = {
  tooltip: {},
  ripple:  {},
}

// matchMedia mock (needed by FullCalendar and Chart.js)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// scrollHeight writable (PrimeVue DataTable)
Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
  configurable: true, writable: true, value: 0,
})

// ResizeObserver mock (FullCalendar, Chart.js)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

// Canvas mock (Chart.js)
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(), clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: [] }),
  putImageData: vi.fn(), createImageData: vi.fn().mockReturnValue([]),
  setTransform: vi.fn(), drawImage: vi.fn(), save: vi.fn(), fillText: vi.fn(),
  restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  closePath: vi.fn(), stroke: vi.fn(), translate: vi.fn(), scale: vi.fn(),
  rotate: vi.fn(), arc: vi.fn(), fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }),
  transform: vi.fn(), rect: vi.fn(), clip: vi.fn(),
  canvas: { width: 800, height: 600 },
}) as any

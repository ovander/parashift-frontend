import { createI18n } from 'vue-i18n'

// ── Locale types and constants ──────────────────────────────────────────────

export type Locale = 'fr' | 'en'
export const SUPPORTED_LOCALES: Locale[] = ['fr', 'en']
export const LOCALE_KEY = 'parashift:locale'

// ── Sprint 1 T1.1: FR-default locale resolution ────────────────────────────

/**
 * Resolves the initial locale with the following priority:
 * 1. Value persisted in localStorage (e.g. user previously selected EN)
 * 2. Browser language — if English, start in EN
 * 3. Default: French
 */
export function loadPersistedLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY)
  if (saved === 'fr' || saved === 'en') return saved
  const browser = navigator.language.split('-')[0]
  if (browser === 'en') return 'en'
  return 'fr'
}

// ── i18n instance ───────────────────────────────────────────────────────────

export const i18n = createI18n({
  legacy:         false,      // Composition API mode
  locale:         loadPersistedLocale(),
  fallbackLocale: 'en',       // keys are in English
  messages:       {},         // populated lazily by loadLocaleMessages()

  // CR-6 — observability: surface missing keys immediately in dev,
  // and log a warning in production for future monitoring hooks.
  missing: (locale: string, key: string) => {
    if (import.meta.env.DEV) {
      console.error(
        `[i18n:missing] key="${key}" locale="${locale}" — add to src/locales/${locale}/<namespace>.json`,
      )
    } else {
      // Production: non-blocking warn. Wire to Sentry/Datadog when available.
      console.warn(`[i18n:missing] key="${key}" locale="${locale}"`)
    }
  },
})

// ── Sprint 2 T2.1: Lazy namespace loader ───────────────────────────────────

/**
 * Each JSON file corresponds to one namespace and is imported dynamically.
 * Files must exist at src/locales/{locale}/{namespace}.json.
 * Add new namespaces here as the app grows.
 */
const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'schedule',
  'admin',
  'config',
  'manager',
  'employee',
  'leave',
  'swap',
  'rules',
  'ai',
  'coverage',
  'errors',
] as const

const _loaded = new Set<string>()

/**
 * Lazily loads all namespace JSON files for a given locale and registers
 * them with the i18n instance. Subsequent calls for the same locale are
 * no-ops (idempotent).
 *
 * Call this:
 * - In App.vue onMounted for the initial locale
 * - In useLocale.setLocale() when the user switches language
 */
export async function loadLocaleMessages(locale: Locale): Promise<void> {
  if (_loaded.has(locale)) return

  const merged: Record<string, unknown> = {}

  await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`../locales/${locale}/${ns}.json`)
        // Each JSON file's top-level keys belong to the namespace object.
        // e.g. common.json { "save": "Save" } → messages.common.save = "Save"
        merged[ns] = mod.default
      } catch {
        console.warn(`[i18n] Could not load locales/${locale}/${ns}.json`)
      }
    }),
  )

  i18n.global.setLocaleMessage(locale, merged)
  _loaded.add(locale)
}

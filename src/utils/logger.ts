/**
 * T5.4 observability hook — wire to Sentry / Datadog when available.
 * Called every time we fall back to 'errors.unknown' in production.
 * Replace the no-op body with an analytics call as the observability
 * layer matures:
 *   import * as Sentry from '@sentry/vue'
 *   Sentry.captureMessage(`[i18n:fallback] ${key ?? 'no-key'}`, 'warning')
 */
function _trackFallback(key: string | undefined, locale: string): void {
  if (!import.meta.env.PROD) return
  // Placeholder: log at warn level so it shows in production browser consoles
  // and can be captured by any existing logging infrastructure.
  console.warn(`[i18n:fallback] key="${key ?? 'none'}" locale="${locale}" — rendered errors.unknown`)
}

/**
 * Extracts a human-readable message from an Axios error response.
 *
 * CR-2 contract: the UI MUST NEVER display raw backend `message` text.
 * All user-visible output is resolved through vue-i18n:
 *   1. If the AppError carries an i18n `key` that exists in translations →
 *      t(key, params)  where params come from the backend (rule violation context)
 *   2. Otherwise → t('errors.unknown')  (universal FR/EN fallback)
 *
 * The raw `message` field is intentionally NOT returned — it is dev-only and
 * is logged to the console in DEV mode for debugging.
 *
 * @param err   - Axios error (or any thrown value)
 * @returns     - A translated user-facing string
 */
// Static import: there is no actual circular dependency between logger.ts and
// plugins/i18n.ts (i18n.ts only imports from vue-i18n), so the original lazy
// require() was unnecessary and breaks the Vitest test environment where CJS
// require() cannot resolve '@/' path aliases.
import { i18n } from '@/plugins/i18n'

export function extractApiError(err: any): string {
  const { t, te, locale } = i18n.global

  // Support both { error: {...} } and flat { key, message, params } shapes.
  const body   = err?.response?.data
  const appErr = body?.error ?? body   // flatten if the backend nests under "error"

  if (appErr?.key) {
    // CR-4: surface missing key in dev immediately so regressions are caught fast.
    if (import.meta.env.DEV && !te(appErr.key)) {
      console.error(
        `[i18n:missing] key="${appErr.key}" locale="${String(locale.value)}" — ` +
        `add to src/locales/{locale}/<namespace>.json`,
      )
    }
    if (te(appErr.key)) {
      // T5.4: pass params from the backend (e.g. rule violation context like
      // { name, worked, limit } for rules.violation.maxHours).
      const params: Record<string, unknown> = {
        ...(appErr.params  ?? {}),
        ...(appErr.details ?? {}),
      }
      return t(appErr.key, params)
    }
  }

  // CR-2: raw message is dev-only — never shown to the user.
  if (import.meta.env.DEV && appErr?.message) {
    console.warn(`[i18n] No key resolved for API error (dev only): ${appErr.message}`)
  }

  // T5.4: track fallback-to-unknown events in production for monitoring.
  _trackFallback(appErr?.key, String(locale.value))

  return t('errors.unknown')
}

/**
 * Dev-only logger. In production builds Vite statically replaces
 * `import.meta.env.DEV` with `false`, so Rollup tree-shakes every
 * branch and no console calls reach the production bundle.
 *
 * Usage:
 *   devlog.info('[PlanStore] fetchOrCreate', { storeId, weekStart })
 *   devlog.warn('[usePlannerLayers] core layer cannot be disabled')
 *
 * Scoped helper:
 *   const log = createDevlog('PlanStore')
 *   log.info('fetchOrCreate →', { storeId })
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (..._args: unknown[]) => {}

const isDev = import.meta.env.DEV

export const devlog = {
  debug: isDev ? (...args: unknown[]) => console.debug('[parashift]', ...args) : noop,
  info:  isDev ? (...args: unknown[]) => console.info('[parashift]', ...args)  : noop,
  warn:  isDev ? (...args: unknown[]) => console.warn('[parashift]', ...args)  : noop,
  error: isDev ? (...args: unknown[]) => console.error('[parashift]', ...args) : noop,
}

/**
 * Creates a scoped logger that prefixes every message with `[scope]`.
 * Zero overhead in production — the entire returned object tree-shakes away.
 */
export function createDevlog(scope: string) {
  const tag = `[${scope}]`
  return {
    debug: isDev ? (...args: unknown[]) => console.debug(tag, ...args) : noop,
    info:  isDev ? (...args: unknown[]) => console.info(tag, ...args)  : noop,
    warn:  isDev ? (...args: unknown[]) => console.warn(tag, ...args)  : noop,
    error: isDev ? (...args: unknown[]) => console.error(tag, ...args) : noop,
  }
}

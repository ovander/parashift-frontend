/**
 * Extracts a human-readable message from an Axios error response.
 * Priority: error.response.data.error.message → data.message → err.message → fallback
 */
export function extractApiError(err: any, fallback = 'An unexpected error occurred'): string {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  )
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

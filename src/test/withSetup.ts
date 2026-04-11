import { createApp, defineComponent } from 'vue'
import type { Plugin } from 'vue'

/**
 * Test helper — mounts a composable inside a minimal Vue app so that it has
 * access to the provide/inject context required by vue-i18n, Pinia, etc.
 *
 * Returns a tuple of [composable result, app instance].
 * The caller is responsible for unmounting the app when the test is done, but
 * Vitest's jsdom environment cleans up automatically between test files.
 *
 * Usage:
 *   const i18n = createI18n({ legacy: false, locale: 'fr', messages: { fr: {}, en: {} } })
 *   const [fmt] = withSetup(() => useDateFormat(), { plugins: [i18n] })
 *   expect(fmt.formatDate('2026-04-09')).toContain('avr')
 */
export function withSetup<T>(
  composable: () => T,
  options: { plugins?: Plugin[] } = {},
): [T, ReturnType<typeof createApp>] {
  let result!: T

  const Wrapper = defineComponent({
    setup() {
      result = composable()
      // Return nothing — this component renders no DOM
      return () => null
    },
  })

  const app = createApp(Wrapper)
  options.plugins?.forEach((p) => app.use(p))
  app.mount(document.createElement('div'))

  return [result, app]
}

import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

/**
 * Reactive breakpoint state composable.
 * Single source of truth for JS-layer responsive decisions.
 *
 * Breakpoints (mirror Tailwind):
 *   isMobile  → < 768px   (phone)
 *   isTablet  → 768–1023px (iPad portrait, small laptop)
 *   isDesktop → ≥ 1024px  (iPad landscape, monitor)
 *
 * Rule: never read window.innerWidth directly in a component — use this.
 */
export function useBreakpoint() {
  const ui = useUiStore()
  return {
    isMobile:   computed(() => ui.isMobile),
    isTablet:   computed(() => ui.isTablet),
    isDesktop:  computed(() => ui.isDesktop),
    /** true from tablet and up (≥ 768px) */
    isTabletUp: computed(() => !ui.isMobile),
    /** alias for isTabletUp — data-entry available */
    canEdit:    computed(() => ui.canEdit),
  }
}

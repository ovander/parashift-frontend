import { computed, type ComputedRef } from 'vue'
import { useUiStore } from '@/stores/ui'

type HideAt = 'mobile' | 'tablet'

export interface ResponsiveColumn {
  field?:    string
  header?:   string
  /**
   * Hide this column at the given breakpoint and below.
   *
   * hide: 'mobile'  → hidden only on mobile (< 768px)
   * hide: 'tablet'  → hidden on mobile AND tablet (desktop-only)
   */
  hide?:     HideAt
  sortable?: boolean
  style?:    string
  [key: string]: unknown
}

/**
 * Filters a column definition array based on the current device.
 *
 * Usage:
 *   const cols = useResponsiveColumns([
 *     { field: 'name',      header: 'Name' },
 *     { field: 'store',     header: 'Store',      hide: 'mobile' },
 *     { field: 'email',     header: 'Email',      hide: 'tablet' },
 *     { field: 'startDate', header: 'Start date', hide: 'tablet' },
 *   ])
 *   // Returns ComputedRef<ResponsiveColumn[]> filtered for current device
 */
export function useResponsiveColumns<T extends ResponsiveColumn>(
  cols: T[],
): ComputedRef<T[]> {
  const ui = useUiStore()
  return computed(() =>
    cols.filter((c) => {
      if (c.hide === 'mobile' && ui.isMobile)   return false
      if (c.hide === 'tablet' && !ui.isDesktop) return false  // hidden on mobile + tablet
      return true
    }),
  )
}

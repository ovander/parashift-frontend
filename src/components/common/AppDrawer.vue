<template>
  <Drawer
    v-bind="$attrs"
    :position="position"
    :style="drawerStyle"
    @update:visible="$emit('update:visible', $event)"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import Drawer from 'primevue/drawer'

/**
 * Responsive Drawer wrapper.
 * Replaces all raw <Drawer :style="{ width: 'Xpx' }"> usages.
 *
 * Width per device:
 *   mobile  (< 768px)  → 100vw (full screen)
 *   tablet  (768–1023) → min(85vw, desktop-width)
 *   desktop (≥ 1024px) → sm: 320px | md: 420px | lg: 520px | xl: 760px
 *
 * Usage:
 *   <AppDrawer v-model:visible="open" position="right" size="md">
 *     ...content...
 *   </AppDrawer>
 */
const props = withDefaults(defineProps<{
  position?: 'left' | 'right' | 'top' | 'bottom'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), { position: 'right', size: 'md' })

defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const ui = useUiStore()

const DESKTOP_WIDTHS: Record<string, string> = {
  sm: '320px',
  md: '420px',
  lg: '520px',
  xl: '760px',
}

const drawerStyle = computed(() => {
  const desktopWidth = DESKTOP_WIDTHS[props.size]
  if (ui.isMobile) return { width: '100vw' }
  if (ui.isTablet) return { width: `min(85vw, ${desktopWidth})` }
  return { width: desktopWidth }
})
</script>

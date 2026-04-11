import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type UiLayer = 'planner' | 'employee' | 'admin'

// ── Breakpoints (mirror Tailwind defaults) ─────────────────────────────────
// md  = 768px  → tablet starts / isMobile ends
// lg  = 1024px → desktop starts / isTablet ends
const BP_MD = 768
const BP_LG = 1024

export const useUiStore = defineStore('ui', () => {
  // ── Screen size ────────────────────────────────────────────────────────
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)

  const isMobile  = computed(() => windowWidth.value < BP_MD)
  const isTablet  = computed(() => windowWidth.value >= BP_MD && windowWidth.value < BP_LG)
  const isDesktop = computed(() => windowWidth.value >= BP_LG)
  /** true from tablet and up — data-entry is available */
  const canEdit   = computed(() => !isMobile.value)

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      windowWidth.value = window.innerWidth
    }, { passive: true })
  }

  // ── Sidebar ────────────────────────────────────────────────────────────
  const sidebarCollapsed = ref(false)

  // ── Loading ────────────────────────────────────────────────────────────
  const loading          = ref(false)
  const loadingMessage   = ref('')

  // ── Layer / toast ──────────────────────────────────────────────────────
  const activeLayer      = ref<UiLayer>('planner')
  const toastMessages    = ref<Array<{
    severity: 'success' | 'info' | 'warn' | 'error'
    summary:  string
    detail:   string
    life?:    number
  }>>([])

  function setLayer(layer: UiLayer)        { activeLayer.value = layer }
  function toggleSidebar()                  { sidebarCollapsed.value = !sidebarCollapsed.value }
  function setLoading(v: boolean, msg = '') { loading.value = v; loadingMessage.value = msg }
  function showToast(
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail = '',
    life = 3_000,
  ) {
    toastMessages.value.push({ severity, summary, detail, life })
  }

  return {
    // screen
    windowWidth, isMobile, isTablet, isDesktop, canEdit,
    // sidebar
    sidebarCollapsed,
    // loading
    loading, loadingMessage,
    // layer / toast
    activeLayer, toastMessages,
    setLayer, toggleSidebar, setLoading, showToast,
  }
})

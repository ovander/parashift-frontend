import { defineStore } from 'pinia'
import { ref } from 'vue'

export type UiLayer = 'planner' | 'employee' | 'admin'

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const loading          = ref(false)
  const loadingMessage   = ref('')
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
    sidebarCollapsed, loading, loadingMessage, activeLayer, toastMessages,
    setLayer, toggleSidebar, setLoading, showToast,
  }
})

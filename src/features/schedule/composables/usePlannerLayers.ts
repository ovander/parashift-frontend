import { ref, watch } from 'vue'
import { createDevlog } from '@/utils/logger'
import type { PlannerLayer } from '@/types'

const log = createDevlog('usePlannerLayers')

const STORAGE_KEY = 'parashift:planner-layers'

const defaultLayers: Record<PlannerLayer, boolean> = {
  core: true,
  coverage: true,
  violations: true,
  ai: false,
}

function loadFromStorage(): Record<PlannerLayer, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = { ...defaultLayers, ...JSON.parse(raw) }
      log.debug('loaded layers from localStorage', parsed)
      return parsed
    }
  } catch (err) {
    log.warn('failed to parse layers from localStorage; using defaults', err)
  }
  return { ...defaultLayers }
}

// Module-level singleton so all consumers share the same state
const layers = ref<Record<PlannerLayer, boolean>>(loadFromStorage())

watch(
  layers,
  (v) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
    log.debug('layers persisted to localStorage', v)
  },
  { deep: true }
)

export function usePlannerLayers() {
  function toggle(layer: PlannerLayer) {
    if (layer === 'core') {
      log.warn('toggle: core layer cannot be disabled — ignoring')
      return
    }
    const next = !layers.value[layer]
    log.info(`toggle: ${layer} → ${next ? 'ON' : 'OFF'}`)
    layers.value[layer] = next
  }

  function isActive(layer: PlannerLayer): boolean {
    return layers.value[layer]
  }

  function setLayer(layer: PlannerLayer, value: boolean) {
    if (layer === 'core') {
      log.warn('setLayer: core layer cannot be changed — ignoring')
      return
    }
    log.debug(`setLayer: ${layer} = ${value}`)
    layers.value[layer] = value
  }

  return { layers, toggle, isActive, setLayer }
}

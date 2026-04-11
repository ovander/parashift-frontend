<template>
  <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
    <button
      v-for="layer in layerDefs"
      :key="layer.key"
      class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
      :class="[
        isActive(layer.key)
          ? 'bg-brand-500 text-white'
          : 'text-gray-500 hover:bg-gray-100',
        layer.key === 'core' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
      ]"
      :disabled="layer.key === 'core'"
      @click="toggle(layer.key)"
    >
      <i :class="layer.icon" class="text-xs" />
      {{ layer.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePlannerLayers } from '../composables/usePlannerLayers'
import type { PlannerLayer } from '@/types'

const { t } = useI18n()
const { toggle, isActive } = usePlannerLayers()

const layerDefs: { key: PlannerLayer; label: string; icon: string }[] = [
  { key: 'core',       label: t('schedule.layers.core'),       icon: 'pi pi-calendar' },
  { key: 'coverage',   label: t('schedule.layers.coverage'),   icon: 'pi pi-chart-bar' },
  { key: 'violations', label: t('schedule.layers.violations'), icon: 'pi pi-exclamation-triangle' },
  { key: 'ai',         label: t('schedule.layers.ai'),         icon: 'pi pi-sparkles' },
]
</script>

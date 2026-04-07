<template>
  <div class="flex items-center gap-2">
    <ProgressBar :value="pct" :show-value="false" :class="barClass" style="height: 6px; flex:1" />
    <span class="text-xs font-medium" :class="textClass">{{ Math.round(pct) }}%</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'

const props = defineProps<{ confidence: number }>()  // 0–1

const pct = computed(() => Math.round(props.confidence * 100))

const barClass = computed(() => {
  if (props.confidence >= 0.8) return '[&_.p-progressbar-value]:bg-green-500'
  if (props.confidence >= 0.5) return '[&_.p-progressbar-value]:bg-brand-500'
  return '[&_.p-progressbar-value]:bg-amber-400'
})

const textClass = computed(() => {
  if (props.confidence >= 0.8) return 'text-green-600'
  if (props.confidence >= 0.5) return 'text-brand-600'
  return 'text-amber-500'
})
</script>

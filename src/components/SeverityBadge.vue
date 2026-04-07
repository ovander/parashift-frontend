<template>
  <Tag :value="label" :severity="primeSeverity" :class="extraClass" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import type { RuleSeverity } from '@/types'

const props = defineProps<{ severity: RuleSeverity }>()

const label = computed(() => props.severity)

const primeSeverity = computed(() => {
  switch (props.severity) {
    case 'BLOCKING': return 'danger'
    case 'WARNING':  return 'warn'
    case 'INFO':     return 'info'
  }
})

const extraClass = computed(() => {
  switch (props.severity) {
    case 'BLOCKING': return 'font-semibold'
    case 'WARNING':  return ''
    case 'INFO':     return 'opacity-80'
  }
})
</script>

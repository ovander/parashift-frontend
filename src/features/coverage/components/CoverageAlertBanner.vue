<template>
  <div class="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
    <i class="pi pi-exclamation-triangle text-amber-500" />
    <span>{{ coverageStore.coverage?.gap_count }} coverage gap{{ coverageStore.coverage?.gap_count !== 1 ? 's' : '' }} detected this week.</span>
    <RouterLink :to="`/stores/${storeId}/coverage`" class="text-brand-600 font-medium hover:underline ml-auto">
      View coverage →
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useCoverageStore } from '../stores/coverageStore'
defineProps<{ storeId: string }>()
const coverageStore = useCoverageStore()
</script>

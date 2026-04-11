<template>
  <div class="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
    <i class="pi pi-exclamation-triangle text-amber-500" />
    <span>{{ t('coverage.gapAlert', coverageStore.coverage?.gap_count ?? 0, { count: coverageStore.coverage?.gap_count ?? 0 }) }}</span>
    <RouterLink :to="`/stores/${storeId}/coverage`" class="text-brand-600 font-medium hover:underline ml-auto">
      {{ t('coverage.viewCoverage') }}
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCoverageStore } from '../stores/coverageStore'
defineProps<{ storeId: string }>()
const coverageStore = useCoverageStore()
const { t } = useI18n()
</script>

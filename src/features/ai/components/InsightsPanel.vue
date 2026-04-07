<template>
  <div class="space-y-3">
    <Button icon="pi pi-refresh" text size="small" :label="'Refresh'" :loading="aiStore.loadingInsights" @click="load" />

    <div v-if="aiStore.loadingInsights" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" height="100px" border-radius="8px" />
    </div>

    <div v-else-if="aiStore.errorInsights" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {{ aiStore.errorInsights }}
    </div>

    <div v-else-if="aiStore.insights.length === 0" class="text-center py-8 text-gray-400 text-sm">
      {{ t('ai.noInsights') }}
    </div>

    <div
      v-for="insight in aiStore.insights"
      :key="insight.id"
      class="p-3 bg-white border rounded-lg space-y-2"
      :class="insightBorder(insight.type)"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          <i :class="insightIcon(insight.type)" class="text-lg" />
          <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ insight.type }}</span>
        </div>
        <Button icon="pi pi-times" text rounded size="small" :aria-label="t('ai.dismiss')" @click="aiStore.dismissInsight(storeId, insight.id)" />
      </div>
      <p class="text-sm text-gray-800">{{ insight.message }}</p>
      <p class="text-xs text-gray-500 italic">{{ insight.recommendation }}</p>
      <ConfidenceBar :confidence="insight.confidence" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { useAIStore } from '../stores/aiStore'
import ConfidenceBar from './ConfidenceBar.vue'
import type { AIInsightType } from '@/types'

const props = defineProps<{ storeId: string }>()
const { t } = useI18n()
const aiStore = useAIStore()

onMounted(load)
function load() { aiStore.fetchInsights(props.storeId) }

function insightIcon(type: AIInsightType) {
  const m: Record<AIInsightType, string> = {
    COVERAGE: 'pi pi-users text-brand-500',
    REST:     'pi pi-moon text-indigo-400',
    FAIRNESS: 'pi pi-balance-scale text-green-500',
    COST:     'pi pi-euro text-amber-500',
  }
  return m[type]
}

function insightBorder(type: AIInsightType) {
  const m: Record<AIInsightType, string> = {
    COVERAGE: 'border-brand-200',
    REST:     'border-indigo-200',
    FAIRNESS: 'border-green-200',
    COST:     'border-amber-200',
  }
  return m[type]
}
</script>

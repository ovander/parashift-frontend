<template>
  <aside class="w-72 flex-shrink-0 bg-white border-r flex flex-col h-full">
    <!-- Tabs: Suggestions / Insights / Scenarios -->
    <div class="border-b">
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex-1 py-2.5 text-xs font-medium transition-colors border-b-2"
          :class="activeTab === tab.id
            ? 'border-brand-500 text-brand-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon" class="mr-1" />{{ t(tab.labelKey) }}
        </button>
      </div>
    </div>

    <!-- Suggestions tab -->
    <div v-if="activeTab === 'suggestions'" class="flex-1 overflow-y-auto">
      <div class="p-3 border-b bg-gray-50">
        <p class="text-xs text-gray-500 mb-2">{{ t('schedule.optimize.aiAssistLevel') }}</p>
        <div class="space-y-1">
          <label
            v-for="tier in aiTiers"
            :key="tier.value"
            class="flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-white"
            :class="selectedTier === tier.value ? 'bg-white shadow-sm ring-1 ring-brand-200' : ''"
          >
            <input
              type="radio"
              :value="tier.value"
              v-model="selectedTier"
              class="mt-0.5 accent-brand-500"
            />
            <div>
              <p class="text-xs font-medium text-gray-800">{{ tier.label }}</p>
              <p class="text-xs text-gray-500">{{ tier.description }}</p>
            </div>
          </label>
        </div>
      </div>

      <div v-if="aiSuggestions.length === 0" class="p-6 text-center text-gray-400">
        <i class="pi pi-sparkles text-2xl mb-2 block" />
        <p class="text-sm">{{ t('schedule.optimize.noSuggestions') }}</p>
        <Button
          size="small"
          class="mt-3"
          :label="t('schedule.optimize.generate')"
          icon="pi pi-refresh"
          @click="generateSuggestions"
          :loading="generating"
        />
      </div>

      <div v-else class="divide-y">
        <div
          v-for="s in aiSuggestions"
          :key="s.id"
          class="p-3 hover:bg-gray-50"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-medium text-gray-800 truncate">{{ s.description }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ s.type }}</p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <Button
                size="small"
                icon="pi pi-check"
                text
                severity="success"
                :v-tooltip="t('common.apply')"
                @click="applySuggestion(s.id)"
              />
              <Button
                size="small"
                icon="pi pi-times"
                text
                severity="secondary"
                :v-tooltip="t('schedule.optimize.dismiss')"
                @click="dismissSuggestion(s.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Insights tab -->
    <div v-if="activeTab === 'insights'" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="bg-gray-50 rounded-lg p-3"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-gray-500">{{ metric.label }}</span>
          <span class="text-xs font-semibold" :class="metric.color">{{ metric.value }}</span>
        </div>
        <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="metric.barColor"
            :style="{ width: metric.pct + '%' }"
          />
        </div>
      </div>

      <div class="text-xs text-gray-400 text-center pt-2">
        {{ t('schedule.optimize.weekOf') }} {{ ctx.weekStart }}
      </div>
    </div>

    <!-- Scenarios tab -->
    <div v-if="activeTab === 'scenarios'" class="flex-1 overflow-y-auto p-4">
      <p class="text-xs text-gray-500 mb-3">{{ t('schedule.optimize.scenarioDescription') }}</p>
      <p class="text-xs text-gray-400 text-center pt-4">{{ t('schedule.optimize.scenarioComingSoon') }}</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useApi } from '@/composables/useApi'
import { useStoreContext } from '@/stores/storeContext'
import type { AISuggestion } from '@/types'

const { t } = useI18n()
const ctx = useStoreContext()
const api = useApi()

const activeTab = ref<'suggestions' | 'insights' | 'scenarios'>('suggestions')
const selectedTier = ref<'suggest' | 'assisted' | 'auto'>('suggest')
const aiSuggestions = ref<AISuggestion[]>([])
const generating = ref(false)

const tabs = [
  { id: 'suggestions' as const, labelKey: 'schedule.optimize.aiTab',        icon: 'pi pi-sparkles' },
  { id: 'insights'    as const, labelKey: 'schedule.optimize.insightsTab',  icon: 'pi pi-chart-line' },
  { id: 'scenarios'   as const, labelKey: 'schedule.optimize.scenariosTab', icon: 'pi pi-copy' },
]

const aiTiers = [
  { value: 'suggest'  as const, label: t('schedule.optimize.suggestTier'),        description: t('schedule.optimize.suggestDescription') },
  { value: 'assisted' as const, label: t('schedule.optimize.assistedTier'), description: t('schedule.optimize.assistedDescription') },
  { value: 'auto'     as const, label: t('schedule.optimize.autoTier'),  description: t('schedule.optimize.autoDescription') },
]

const metrics = computed(() => [
  { label: t('schedule.optimize.coverageRate'),  value: '—',   pct: 0,  color: 'text-green-600', barColor: 'bg-green-400' },
  { label: t('schedule.optimize.overtimeHours'), value: '—',   pct: 0,  color: 'text-orange-600', barColor: 'bg-orange-400' },
  { label: t('schedule.optimize.violations'),     value: '—',   pct: 0,  color: 'text-red-600', barColor: 'bg-red-400' },
  { label: t('schedule.optimize.adjustments'),    value: '—',   pct: 0,  color: 'text-blue-600', barColor: 'bg-blue-400' },
])

async function generateSuggestions() {
  generating.value = true
  try {
    const res = await api.get<AISuggestion[]>(
      `/api/v1/stores/${ctx.storeId}/ai/insights?week_of=${ctx.weekStart}`
    )
    aiSuggestions.value = res.data ?? []
  } finally {
    generating.value = false
  }
}

async function applySuggestion(id: string) {
  await api.post(`/api/v1/stores/${ctx.storeId}/ai/insights/${id}/apply`)
  aiSuggestions.value = aiSuggestions.value.filter((s) => s.id !== id)
}

function dismissSuggestion(id: string) {
  aiSuggestions.value = aiSuggestions.value.filter((s) => s.id !== id)
}
</script>

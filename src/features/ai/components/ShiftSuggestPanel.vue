<template>
  <div class="space-y-4">
    <div class="flex gap-2">
      <Select
        v-model="selectedShiftId"
        :options="shiftOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('ai.selectShift')"
        fluid
      />
      <Button
        :label="t('ai.getSuggestions')"
        icon="pi pi-sparkles"
        :loading="aiStore.loadingSuggest"
        :disabled="!selectedShiftId"
        @click="load"
      />
    </div>

    <!-- Idle -->
    <div v-if="!aiStore.loadingSuggest && aiStore.suggestions.length === 0 && !aiStore.errorSuggest" class="text-center py-8 text-gray-400 text-sm">
      {{ t('ai.selectShiftIdle', { btn: t('ai.getSuggestions') }) }}
    </div>

    <!-- Loading skeletons -->
    <div v-if="aiStore.loadingSuggest" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" height="80px" border-radius="8px" />
    </div>

    <!-- Error -->
    <div v-if="aiStore.errorSuggest" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
      <i class="pi pi-exclamation-triangle" />
      {{ aiStore.errorSuggest }}
      <Button link size="small" :label="t('common.retry')" @click="load" class="ml-auto" />
    </div>

    <!-- Results -->
    <div v-for="s in aiStore.suggestions" :key="s.employee_id" class="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-medium text-sm">{{ s.employee?.name }}</span>
        <Button size="small" :label="t('schedule.assign')" @click="apply(s)" :loading="applying === s.employee_id" />
      </div>
      <ConfidenceBar :confidence="s.confidence ?? 0.5" />
      <p class="text-xs text-gray-500">{{ s.reason }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import { useAIStore } from '../stores/aiStore'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useStoreContext } from '@/stores/storeContext'
import ConfidenceBar from './ConfidenceBar.vue'
import type { ScheduleSuggestion } from '@/types'

const { t } = useI18n()
const aiStore       = useAIStore()
const scheduleStore = useScheduleStore()
const ctx           = useStoreContext()
const applying      = ref<string | null>(null)
const selectedShiftId = ref<string | null>(null)

const shiftOptions = computed(() =>
  scheduleStore.shifts.map((s) => ({
    label: `${s.date} ${s.start_time}–${s.end_time}${s.required_role ? ` · ${s.required_role}` : ''}`,
    value: s.id,
  })),
)

async function load() {
  if (!selectedShiftId.value) return
  await aiStore.fetchSuggestions(ctx.storeId, selectedShiftId.value)
}

async function apply(s: ScheduleSuggestion) {
  if (!selectedShiftId.value) return
  applying.value = s.employee_id
  try {
    await scheduleStore.assign(ctx.storeId, selectedShiftId.value, s.employee_id)
    selectedShiftId.value = null
    aiStore.suggestions = []
  } finally {
    applying.value = null
  }
}
</script>

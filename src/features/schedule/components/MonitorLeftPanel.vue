<template>
  <aside class="w-72 flex-shrink-0 bg-white border-r flex flex-col h-full overflow-y-auto">
    <div class="p-4 border-b">
      <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <i class="pi pi-chart-line text-brand-500" /> Weekly KPIs
      </h3>
      <p class="text-xs text-gray-500 mt-0.5">Week of {{ ctx.weekStart }}</p>
    </div>

    <!-- KPI tiles -->
    <div class="p-4 grid grid-cols-2 gap-3">
      <div
        v-for="kpi in kpiTiles"
        :key="kpi.label"
        class="bg-gray-50 rounded-xl p-3 flex flex-col gap-1"
      >
        <span class="text-xs text-gray-500">{{ kpi.label }}</span>
        <span class="text-xl font-bold" :class="kpi.color">{{ kpi.value }}</span>
        <span class="text-xs" :class="kpi.trendColor">
          <i :class="kpi.trendIcon" /> {{ kpi.trend }}
        </span>
      </div>
    </div>

    <!-- Predictive section -->
    <div class="border-t p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Next-week risk</h4>
        <Button
          size="small"
          text
          icon="pi pi-refresh"
          @click="refreshForecast"
          :loading="forecastLoading"
        />
      </div>

      <div v-if="riskFactors.length === 0" class="text-xs text-gray-400 text-center py-4">
        No risk factors detected
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="risk in riskFactors"
          :key="risk.id"
          class="rounded-lg p-3 text-xs"
          :class="riskClass(risk.severity)"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-medium">{{ risk.title }}</p>
              <p class="text-gray-600 mt-0.5">{{ risk.description }}</p>
            </div>
            <Tag :severity="riskTagSeverity(risk.severity)" :value="risk.severity" class="text-xs" />
          </div>
          <Button
            v-if="risk.actionLabel"
            size="small"
            text
            class="mt-2 -mb-1 -ml-1 text-xs"
            :label="risk.actionLabel"
            @click="handleRiskAction(risk)"
          />
        </div>
      </div>
    </div>

    <!-- Patterns section -->
    <div class="border-t p-4">
      <h4 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Patterns</h4>
      <div class="space-y-2 text-xs text-gray-600">
        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <i class="pi pi-calendar text-blue-500" />
          <span>Mondays consistently understaffed</span>
        </div>
        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <i class="pi pi-clock text-orange-500" />
          <span>Overtime peaks mid-week</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useStoreContext } from '@/stores/storeContext'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { usePlanStore } from '@/stores/planStore'

interface RiskFactor {
  id: string
  title: string
  description: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  actionLabel?: string
  actionType?: 'pre-fill' | 'navigate'
}

const ctx = useStoreContext()
const scheduleStore = useScheduleStore()
const planStore = usePlanStore()
const forecastLoading = ref(false)

const riskFactors = ref<RiskFactor[]>([
  {
    id: '1',
    title: 'Understaffing risk',
    description: '3 pharmacists have leave requests next week.',
    severity: 'HIGH',
    actionLabel: 'Pre-fill from template',
    actionType: 'pre-fill',
  },
  {
    id: '2',
    title: 'Expiring qualifications',
    description: '2 employees have certifications expiring within 30 days.',
    severity: 'MEDIUM',
  },
])

const kpiTiles = computed(() => [
  {
    label: 'Coverage',
    value: coverageRate.value,
    color: coverageRate.value === '—' ? 'text-gray-400' : 'text-green-600',
    trend: '—',
    trendColor: 'text-gray-400',
    trendIcon: 'pi pi-minus',
  },
  {
    label: 'Overtime h',
    value: '—',
    color: 'text-orange-600',
    trend: '—',
    trendColor: 'text-gray-400',
    trendIcon: 'pi pi-minus',
  },
  {
    label: 'Violations',
    value: String(violationCount.value),
    color: violationCount.value > 0 ? 'text-red-600' : 'text-green-600',
    trend: '—',
    trendColor: 'text-gray-400',
    trendIcon: 'pi pi-minus',
  },
  {
    label: 'Adjustments',
    value: String(planStore.plan?.override_log?.length ?? 0),
    color: 'text-blue-600',
    trend: '—',
    trendColor: 'text-gray-400',
    trendIcon: 'pi pi-minus',
  },
])

const coverageRate = computed(() => {
  const total = scheduleStore.shifts.length
  if (!total) return '—'
  const assigned = scheduleStore.assignments.length
  return Math.round((assigned / total) * 100) + '%'
})

const violationCount = computed(() => {
  return scheduleStore.assignments.reduce((sum, a) => sum + (a.violations?.length ?? 0), 0)
})

function riskClass(severity: string) {
  switch (severity) {
    case 'HIGH':   return 'bg-red-50 border border-red-200'
    case 'MEDIUM': return 'bg-yellow-50 border border-yellow-200'
    default:       return 'bg-blue-50 border border-blue-200'
  }
}

function riskTagSeverity(severity: string) {
  switch (severity) {
    case 'HIGH':   return 'danger'
    case 'MEDIUM': return 'warning'
    default:       return 'info'
  }
}

async function refreshForecast() {
  forecastLoading.value = true
  // In a real implementation, fetch from /api/v1/stores/{id}/monitor/forecast
  await new Promise((r) => setTimeout(r, 500))
  forecastLoading.value = false
}

function handleRiskAction(risk: RiskFactor) {
  if (risk.actionType === 'pre-fill') {
    // Emit or navigate to next week and trigger template pre-fill
    ctx.nextWeek()
  }
}
</script>

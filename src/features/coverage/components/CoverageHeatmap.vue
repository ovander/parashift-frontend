<template>
  <div class="overflow-x-auto">
    <div class="min-w-max">
      <!-- Hour header -->
      <div class="flex">
        <div class="w-28 flex-shrink-0" />
        <div v-for="h in hours" :key="h" class="w-10 text-center text-xs text-gray-400 pb-1">
          {{ h }}
        </div>
      </div>

      <!-- Day rows -->
      <div v-for="date in allDays" :key="date" class="flex items-center mb-1">
        <!-- Holiday row -->
        <template v-if="holidayMap.get(date)">
          <div class="w-28 flex-shrink-0 text-xs font-medium text-amber-700 pr-2 text-right leading-tight">
            {{ formatDay(date) }}
          </div>
          <div
            class="flex items-center gap-1.5 px-3 h-7 rounded bg-amber-50 border border-amber-200"
            :style="`width: ${hours.length * 40 + (hours.length - 1) * 2}px`"
          >
            <span class="text-[11px] font-semibold text-amber-700">🎉 {{ holidayMap.get(date) }}</span>
            <span class="text-[10px] text-amber-500 italic">{{ t('coverage.publicHoliday') }}</span>
          </div>
        </template>

        <!-- Normal coverage row -->
        <template v-else>
          <div class="w-28 flex-shrink-0 text-xs font-medium text-gray-600 pr-2 text-right">
            {{ formatDay(date) }}
          </div>
          <div
            v-for="h in hours"
            :key="h"
            class="w-10 h-7 rounded mr-0.5 relative group cursor-default"
            :class="cellColor(date, h)"
            :title="cellTitle(date, h)"
          />
        </template>
      </div>

      <!-- Summary row -->
      <div class="mt-3 text-xs text-gray-500 flex gap-6">
        <span>{{ t('coverage.totalSlots') }} <strong>{{ report.total_slots }}</strong></span>
        <span :class="report.gap_count > 0 ? 'text-red-600 font-semibold' : ''">
          {{ t('coverage.gaps') }} <strong>{{ report.gap_count }}</strong>
        </span>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div class="flex items-center gap-1"><div class="w-4 h-4 rounded bg-green-400" /> {{ t('coverage.ok') }}</div>
        <div class="flex items-center gap-1"><div class="w-4 h-4 rounded bg-red-300" /> {{ t('coverage.understaffed') }}</div>
        <div class="flex items-center gap-1"><div class="w-4 h-4 rounded bg-purple-300" /> {{ t('coverage.missingRole') }}</div>
        <div class="flex items-center gap-1"><div class="w-4 h-4 rounded bg-amber-300" /> {{ t('coverage.overstaffed') }}</div>
        <div class="flex items-center gap-1"><div class="w-4 h-4 rounded bg-gray-100" /> {{ t('coverage.noRequirement') }}</div>
        <div class="flex items-center gap-1"><div class="w-4 h-4 rounded bg-amber-50 border border-amber-200" /> {{ t('coverage.publicHoliday') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CoverageReport, CoverageSlot } from '@/types'

const { t, locale } = useI18n()

const props = defineProps<{
  report: CoverageReport
  /** Optional map of ISO date (YYYY-MM-DD) → French holiday name for the displayed range. */
  holidays?: Map<string, string>
}>()

const hours = Array.from({ length: 17 }, (_, i) => i + 6)  // 6–22

/** Convenience accessor — returns an empty Map when no holidays prop is provided. */
const holidayMap = computed(() => props.holidays ?? new Map<string, string>())

/** Sorted unique dates: union of coverage-slot dates and public holiday dates. */
const allDays = computed(() => {
  const set = new Set((props.report.items ?? []).map((s) => s.date))
  for (const date of holidayMap.value.keys()) set.add(date)
  return Array.from(set).sort()
})

/**
 * Map keyed by `date:hour` → the slot that covers that hour.
 * A slot with start_time "09:00" and end_time "11:00" covers hours 9 and 10.
 */
const slotMap = computed(() => {
  const m = new Map<string, CoverageSlot>()
  for (const slot of (props.report.items ?? [])) {
    const startHour = parseInt(slot.start_time.split(':')[0], 10)
    const endHour   = parseInt(slot.end_time.split(':')[0], 10)
    for (let h = startHour; h < endHour; h++) {
      m.set(`${slot.date}:${h}`, slot)
    }
  }
  return m
})

function getSlot(date: string, hour: number): CoverageSlot | undefined {
  return slotMap.value.get(`${date}:${hour}`)
}

function cellColor(date: string, hour: number): string {
  const slot = getSlot(date, hour)
  if (!slot) return 'bg-gray-100'
  switch (slot.status) {
    case 'OK':           return 'bg-green-400'
    case 'UNDERSTAFFED': return 'bg-red-300'
    case 'MISSING_ROLE': return 'bg-purple-300'
    case 'OVERSTAFFED':  return 'bg-amber-300'
    default:             return 'bg-gray-200'
  }
}

function cellTitle(date: string, hour: number): string {
  const slot = getSlot(date, hour)
  if (!slot) return `${date} ${hour}:00 — ${t('coverage.noRequirementTooltip')}`
  let title = `${date} ${hour}:00 — ${slot.assigned_count}/${slot.required_count} (${slot.status})`
  if (slot.missing_role && slot.required_role)
    title += ` — needs role "${slot.required_role}"`
  return title
}

function formatDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-2">
    <!-- Day-of-week header -->
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="d in DAY_HEADERS"
        :key="d"
        class="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide py-1"
      >{{ d }}</div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="cell in calendarCells"
        :key="cell.iso"
        :data-iso="cell.iso"
        :data-in-month="cell.inMonth"
        class="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all select-none"
        :class="cellClasses(cell)"
        @click="cell.inMonth && $emit('day-click', cell.iso)"
      >
        <!-- Day number -->
        <span
          class="text-sm font-medium leading-none"
          :class="cell.inMonth ? 'text-gray-800' : 'text-gray-300'"
        >{{ cell.day }}</span>

        <!-- Status dot -->
        <span
          v-if="cell.inMonth"
          class="w-1.5 h-1.5 rounded-full"
          :class="dotColor(cell)"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"/> OK</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/> Understaffed</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"/> Missing role</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/> Overstaffed</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block"/> No requirement</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-200 inline-block"/> Jour férié</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CoverageReport } from '@/types'

const props = defineProps<{
  /** YYYY-MM — the month being displayed */
  month:    string
  report:   CoverageReport | null
  holidays: Map<string, string>
}>()

defineEmits<{ 'day-click': [iso: string] }>()

const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ── Calendar grid ─────────────────────────────────────────────────────────────

interface CalendarCell {
  iso:     string  // YYYY-MM-DD
  day:     number  // 1–31
  inMonth: boolean
}

const calendarCells = computed((): CalendarCell[] => {
  const [y, m] = props.month.split('-').map(Number)

  // First day of month; find the Monday that starts its week (ISO week: Mon = 0)
  const firstOfMonth = new Date(y, m - 1, 1)
  const dowFirst     = (firstOfMonth.getDay() + 6) % 7   // Mon=0 … Sun=6
  const gridStart    = new Date(y, m - 1, 1 - dowFirst)  // Monday of first week

  // Always render 6 rows (42 cells) so the grid height is stable month to month
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d    = new Date(gridStart.getTime() + i * 86_400_000)
    const iso  = fmtISO(d)
    cells.push({ iso, day: d.getDate(), inMonth: d.getMonth() === m - 1 })
  }
  return cells
})

function fmtISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Day status ─────────────────────────────────────────────────────────────────

/** Aggregate status for a given day from the coverage report. */
function dayStatus(iso: string): 'holiday' | 'missing_role' | 'understaffed' | 'overstaffed' | 'ok' | 'none' {
  if (props.holidays.has(iso))    return 'holiday'
  const slots = (props.report?.items ?? []).filter(s => s.date === iso)
  if (slots.length === 0)         return 'none'
  if (slots.some(s => s.status === 'MISSING_ROLE'))  return 'missing_role'
  if (slots.some(s => s.status === 'UNDERSTAFFED'))  return 'understaffed'
  if (slots.some(s => s.status === 'OVERSTAFFED'))   return 'overstaffed'
  return 'ok'
}

function dotColor(cell: CalendarCell): string {
  switch (dayStatus(cell.iso)) {
    case 'holiday':      return 'bg-amber-200'
    case 'missing_role': return 'bg-purple-400'
    case 'understaffed': return 'bg-red-400'
    case 'overstaffed':  return 'bg-amber-400'
    case 'ok':           return 'bg-green-400'
    default:             return 'bg-gray-200'
  }
}

function cellClasses(cell: CalendarCell): string[] {
  if (!cell.inMonth) return ['cursor-default']
  const status = dayStatus(cell.iso)
  const base   = ['hover:ring-2 hover:ring-offset-1 hover:ring-brand-400']
  switch (status) {
    case 'holiday':      return [...base, 'bg-amber-50']
    case 'missing_role': return [...base, 'bg-purple-50']
    case 'understaffed': return [...base, 'bg-red-50']
    case 'overstaffed':  return [...base, 'bg-amber-50']
    case 'ok':           return [...base, 'bg-green-50']
    default:             return [...base, 'bg-gray-50']
  }
}
</script>

<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :style="{ width: '760px' }"
    @hide="emit('close')"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-calendar text-brand-500" />
        <span class="font-semibold text-gray-900">A/B Planning — {{ props.employeeName }}</span>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="store.loading" class="flex justify-center items-center h-32">
      <i class="pi pi-spin pi-spinner text-2xl text-gray-400" />
    </div>

    <div v-else class="space-y-5 pb-4">

      <!-- Info banner -->
      <div class="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <i class="pi pi-info-circle mt-0.5 flex-shrink-0" />
        <span>
          Weeks alternate <strong>A → B → A → B</strong> from the store anchor date.
          Click <strong>+</strong> to add a shift to a day. You can add multiple shifts per day
          (e.g. split shifts). Leave a day empty for a day off.
        </span>
      </div>

      <!-- ── Week A ─────────────────────────────────────────────────────────── -->
      <div class="rounded-xl border border-blue-200 overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-2.5 bg-blue-50">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-blue-200 text-blue-800">A</span>
          <span class="text-sm font-semibold text-blue-800">Week A</span>
          <span class="text-xs text-gray-400 ml-1">{{ shiftsFor('A').length }} shift{{ shiftsFor('A').length !== 1 ? 's' : '' }}</span>
          <span v-if="totalHours('A') > 0" class="ml-auto text-xs font-medium text-blue-600">{{ totalHours('A') }}h / week</span>
        </div>
        <div class="bg-white">
          <div class="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-100">
            <div v-for="day in DAY_OPTIONS" :key="day.value"
              class="px-2 py-1.5 text-center text-xs font-semibold text-gray-500 bg-gray-50">
              {{ day.label }}
            </div>
          </div>
          <div class="grid grid-cols-7 divide-x divide-gray-100">
            <div v-for="day in DAY_OPTIONS" :key="day.value" class="flex flex-col min-h-[80px]">
              <div v-for="(row, si) in cellsFor('A', day.value)" :key="si"
                class="px-1.5 pt-1.5 flex flex-col gap-0.5 border-b border-dashed border-gray-100 last:border-b-0">
                <input v-model="row.start_time" type="time"
                  class="w-full text-xs border border-gray-200 rounded px-1 py-0.5 font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400" />
                <input v-model="row.end_time" type="time"
                  class="w-full text-xs border border-gray-200 rounded px-1 py-0.5 font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400" />
                <select v-model="row.role"
                  class="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 truncate">
                  <option value="">Any role</option>
                  <option v-for="r in optionsStore.jobRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
                <div class="flex items-center justify-between pb-1">
                  <span class="text-[10px] text-gray-400 leading-none">{{ durationLabel(row.start_time, row.end_time) }}</span>
                  <button class="text-gray-300 hover:text-red-400 transition-colors leading-none" title="Remove"
                    @click="removeShift('A', day.value, si)"><i class="pi pi-times text-[10px]" /></button>
                </div>
              </div>
              <button
                class="flex-1 flex items-center justify-center py-1.5 transition-colors"
                :class="cellsFor('A', day.value).length === 0 ? 'text-gray-200 hover:text-gray-400 hover:bg-gray-50' : 'text-gray-200 hover:text-green-500 hover:bg-green-50'"
                :title="cellsFor('A', day.value).length === 0 ? 'Add shift' : 'Add another shift'"
                @click="addShift('A', day.value)">
                <i class="pi pi-plus text-[10px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Swap button ─────────────────────────────────────────────────────── -->
      <div class="flex justify-center">
        <button
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-600 hover:border-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
          title="Swap all shifts: week A ↔ week B"
          @click="swapWeeks"
        >
          <i class="pi pi-arrow-right-arrow-left text-[11px]" />
          Swap A ↔ B
        </button>
      </div>

      <!-- ── Week B ─────────────────────────────────────────────────────────── -->
      <div class="rounded-xl border border-amber-200 overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-2.5 bg-amber-50">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-amber-200 text-amber-800">B</span>
          <span class="text-sm font-semibold text-amber-800">Week B</span>
          <span class="text-xs text-gray-400 ml-1">{{ shiftsFor('B').length }} shift{{ shiftsFor('B').length !== 1 ? 's' : '' }}</span>
          <span v-if="totalHours('B') > 0" class="ml-auto text-xs font-medium text-amber-600">{{ totalHours('B') }}h / week</span>
        </div>
        <div class="bg-white">
          <div class="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-100">
            <div v-for="day in DAY_OPTIONS" :key="day.value"
              class="px-2 py-1.5 text-center text-xs font-semibold text-gray-500 bg-gray-50">
              {{ day.label }}
            </div>
          </div>
          <div class="grid grid-cols-7 divide-x divide-gray-100">
            <div v-for="day in DAY_OPTIONS" :key="day.value" class="flex flex-col min-h-[80px]">
              <div v-for="(row, si) in cellsFor('B', day.value)" :key="si"
                class="px-1.5 pt-1.5 flex flex-col gap-0.5 border-b border-dashed border-gray-100 last:border-b-0">
                <input v-model="row.start_time" type="time"
                  class="w-full text-xs border border-gray-200 rounded px-1 py-0.5 font-mono text-center focus:outline-none focus:ring-1 focus:ring-amber-300 focus:border-amber-400" />
                <input v-model="row.end_time" type="time"
                  class="w-full text-xs border border-gray-200 rounded px-1 py-0.5 font-mono text-center focus:outline-none focus:ring-1 focus:ring-amber-300 focus:border-amber-400" />
                <select v-model="row.role"
                  class="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-amber-300 focus:border-amber-400 truncate">
                  <option value="">Any role</option>
                  <option v-for="r in optionsStore.jobRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
                <div class="flex items-center justify-between pb-1">
                  <span class="text-[10px] text-gray-400 leading-none">{{ durationLabel(row.start_time, row.end_time) }}</span>
                  <button class="text-gray-300 hover:text-red-400 transition-colors leading-none" title="Remove"
                    @click="removeShift('B', day.value, si)"><i class="pi pi-times text-[10px]" /></button>
                </div>
              </div>
              <button
                class="flex-1 flex items-center justify-center py-1.5 transition-colors"
                :class="cellsFor('B', day.value).length === 0 ? 'text-gray-200 hover:text-gray-400 hover:bg-gray-50' : 'text-gray-200 hover:text-green-500 hover:bg-green-50'"
                :title="cellsFor('B', day.value).length === 0 ? 'Add shift' : 'Add another shift'"
                @click="addShift('B', day.value)">
                <i class="pi pi-plus text-[10px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <span class="text-xs text-gray-400">
          {{ totalRows }} shift{{ totalRows !== 1 ? 's' : '' }} across both weeks
        </span>
        <div class="flex gap-2">
          <Button label="Cancel" outlined @click="visible = false" />
          <Button
            label="Save planning"
            icon="pi pi-check"
            :loading="store.saving"
            @click="save"
          />
        </div>
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import { useWeekTemplateStore } from '@/features/templates/stores/weekTemplateStore'
import type { WeekTemplateEntry } from '@/features/templates/stores/weekTemplateStore'
import { useOptionsStore } from '@/stores/optionsStore'

const optionsStore = useOptionsStore()

// ── Props / emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue:   boolean
  storeId:      string
  employeeId:   string
  employeeName: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'close'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ── Store ─────────────────────────────────────────────────────────────────────

const store = useWeekTemplateStore()

type EditRow = WeekTemplateEntry & { _week: 'A' | 'B' }
const rows = ref<EditRow[]>([])

// Watch only modelValue — employeeId is stable while the drawer is open.
// Using a simple boolean watch avoids the triple-fire that an array watcher
// with immediate:true causes when both props are set at the same time.
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    await store.fetchTemplates(props.storeId, props.employeeId)
    rows.value = store.getEntries(props.employeeId).map((e) => ({
      ...e,
      _week: e.week_type as 'A' | 'B',
    }))
  },
  { immediate: true },
)

// ── Day options (Go convention: 0=Sun, 1=Mon … 6=Sat) ────────────────────────

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

// ── Cell helpers — support multiple shifts per day ────────────────────────────

/** All shifts for a given week + day (may be 0, 1, or more) */
function cellsFor(week: 'A' | 'B', dayOfWeek: number): EditRow[] {
  return rows.value.filter((r) => r._week === week && r.day_of_week === dayOfWeek)
}

/** All shifts for a given week (for totals) */
function shiftsFor(week: 'A' | 'B'): EditRow[] {
  return rows.value.filter((r) => r._week === week)
}

/** Add a new shift slot for a given week + day */
function addShift(week: 'A' | 'B', dayOfWeek: number) {
  const existing = cellsFor(week, dayOfWeek)
  // Default start = last end time of the day (or 08:00 if first shift)
  const lastEnd  = existing.length > 0 ? existing[existing.length - 1].end_time : '08:00'
  // Auto-suggest a 1-hour gap if there's already a shift
  const [h, m]   = lastEnd.split(':').map(Number)
  const gapMins  = existing.length > 0 ? 60 : 0
  const startMin = h * 60 + m + gapMins
  const startH   = Math.floor(startMin / 60) % 24
  const startM   = startMin % 60
  const start    = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
  const [sh, sm] = start.split(':').map(Number)
  const endMin   = sh * 60 + sm + 7 * 60   // default 7h shift
  const endH     = Math.floor(endMin / 60) % 24
  const endMins  = endMin % 60
  const end      = `${String(endH).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

  // Inherit role from the last shift on that day so split shifts keep the same role
  const lastRole = existing.length > 0 ? existing[existing.length - 1].role : ''
  rows.value.push({
    _week:       week,
    week_type:   week,
    day_of_week: dayOfWeek,
    start_time:  start,
    end_time:    end,
    role:        lastRole,
  })
}

/** Swap all week-A shifts to week-B and vice versa */
function swapWeeks() {
  rows.value = rows.value.map((r) => {
    const flipped = r._week === 'A' ? 'B' : 'A'
    return { ...r, _week: flipped, week_type: flipped }
  })
}

/** Remove the nth shift (by index within that day) */
function removeShift(week: 'A' | 'B', dayOfWeek: number, shiftIdxInDay: number) {
  let count = 0
  const globalIdx = rows.value.findIndex((r) => {
    if (r._week !== week || r.day_of_week !== dayOfWeek) return false
    return count++ === shiftIdxInDay
  })
  if (globalIdx !== -1) rows.value.splice(globalIdx, 1)
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const totalRows = computed(() => rows.value.length)

function durationLabel(start: string, end: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (isNaN(sh) || isNaN(eh)) return ''
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${m}`
}

function totalHours(week: 'A' | 'B'): number {
  return Math.round(
    shiftsFor(week).reduce((acc, r) => {
      const [sh, sm] = r.start_time.split(':').map(Number)
      const [eh, em] = r.end_time.split(':').map(Number)
      const mins = (eh * 60 + em) - (sh * 60 + sm)
      return acc + (mins > 0 ? mins / 60 : 0)
    }, 0) * 10,
  ) / 10
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  const entries: WeekTemplateEntry[] = rows.value.map((r) => ({
    week_type:   r._week,
    day_of_week: r.day_of_week,
    start_time:  r.start_time,
    end_time:    r.end_time,
    role:        r.role ?? '',
  }))
  try {
    await store.saveTemplates(props.storeId, props.employeeId, entries)
    visible.value = false
  } catch {
    // error toast already shown by store
  }
}
</script>

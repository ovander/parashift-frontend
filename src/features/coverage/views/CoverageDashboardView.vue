<template>
  <div class="p-6 space-y-6 overflow-y-auto h-full">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Coverage Dashboard</h1>
      <div class="flex items-center gap-2">
        <!-- View toggle -->
        <div class="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          <button
            class="px-3 py-1 text-sm font-medium rounded-md transition-all"
            :class="viewMode === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'"
            @click="viewMode = 'week'"
          >Semaine</button>
          <button
            class="px-3 py-1 text-sm font-medium rounded-md transition-all"
            :class="viewMode === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'"
            @click="viewMode = 'month'"
          >Mois</button>
        </div>

        <!-- DEV ONLY: Audit trail -->
        <Button
          v-if="isDev && viewMode === 'week'"
          icon="pi pi-list-check"
          label="Audit"
          size="small"
          severity="secondary"
          outlined
          v-tooltip="'[DEV] Generate coverage audit trail'"
          @click="auditOpen = true"
        />
        <Button icon="pi pi-refresh" text :loading="isLoading" @click="load" />
      </div>
    </div>

    <!-- Navigation bar (week or month) -->
    <div class="flex items-center gap-3">
      <Button icon="pi pi-chevron-left" text rounded size="small" @click="navPrev" />
      <span class="text-sm font-semibold text-gray-700 w-56 text-center">{{ navLabel }}</span>
      <Button icon="pi pi-chevron-right" text rounded size="small" @click="navNext" />
    </div>

    <!-- Role-mismatch explanation banner (week view only) -->
    <div
      v-if="viewMode === 'week' && missingRoleNames.length > 0"
      class="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm"
    >
      <i class="pi pi-id-card text-purple-500 mt-0.5 flex-shrink-0" />
      <div class="min-w-0">
        <p class="font-medium text-purple-900">Role requirement not satisfied</p>
        <p class="text-purple-700 mt-1">
          Your coverage requirements need role
          <strong>{{ missingRoleNames.join(', ') }}</strong>
          but none of your employees carry that role.
          Employees currently have roles: <strong>{{ employeeRoles.join(', ') || '—' }}</strong>.
        </p>
        <p class="text-purple-600 mt-1">
          Fix: go to
          <RouterLink :to="`/stores/${ctx.storeId}/config`" class="underline font-medium">Store Config → Coverage Requirements</RouterLink>
          and either clear the <em>Required role</em> field or change it to
          <strong>{{ employeeRoles[0] ?? 'employee' }}</strong>.
        </p>
      </div>
    </div>

    <!-- ── Week view ─────────────────────────────────────────────────────── -->
    <template v-if="viewMode === 'week'">
      <div v-if="coverageStore.loading" class="grid grid-cols-7 gap-1">
        <Skeleton v-for="i in 7 * 18" :key="i" height="28px" />
      </div>
      <CoverageHeatmap v-else-if="coverageStore.coverage" :report="coverageStore.coverage" :holidays="weekHolidayMap" />
      <div v-else class="text-center py-16 text-gray-400">
        <i class="pi pi-chart-bar text-4xl mb-3 block" />
        No coverage data available.
      </div>
    </template>

    <!-- ── Month view ────────────────────────────────────────────────────── -->
    <template v-else>
      <div v-if="coverageStore.monthLoading" class="grid grid-cols-7 gap-1">
        <Skeleton v-for="i in 42" :key="i" height="52px" />
      </div>
      <CoverageMonthCalendar
        v-else
        :month="currentMonth"
        :report="coverageStore.monthCoverage"
        :holidays="monthHolidayMap"
        @day-click="onDayClick"
      />
    </template>

    <!-- Audit trail dialog (DEV only) -->
    <Dialog
      v-if="isDev"
      v-model:visible="auditOpen"
      header="🔍 Coverage Audit Trail"
      modal
      :style="{ width: '680px', maxHeight: '80vh' }"
      :pt="{ content: { style: 'overflow-y: auto' } }"
    >
      <div class="font-mono text-xs space-y-4 text-gray-800">
        <!-- Header -->
        <div class="bg-gray-100 rounded p-3 space-y-1">
          <div><span class="text-gray-500">Store:</span> {{ ctx.storeId }}</div>
          <div><span class="text-gray-500">Total slots:</span> {{ coverageAuditData.totalSlots }}</div>
          <div><span class="text-gray-500">Gap slots:</span> <span :class="coverageAuditData.gapCount > 0 ? 'text-red-600' : 'text-green-600'">{{ coverageAuditData.gapCount }}</span></div>
          <div><span class="text-gray-500">Employee job roles present:</span> {{ coverageAuditData.employeeRoles.join(', ') || '—' }}</div>
          <div><span class="text-gray-500">Generated:</span> {{ new Date().toISOString() }}</div>
        </div>

        <!-- Missing role summary -->
        <div v-if="coverageAuditData.missingRoles.length">
          <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">Missing roles</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="role in coverageAuditData.missingRoles"
              :key="role"
              class="bg-red-50 border border-red-200 rounded px-2 py-0.5 text-red-700"
            >{{ role }}</span>
          </div>
        </div>
        <div v-else class="text-green-600">✓ No missing role issues</div>

        <!-- Slot list -->
        <div>
          <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">
            Coverage slots ({{ coverageAuditData.totalSlots }})
          </div>
          <div class="border border-gray-200 rounded overflow-hidden">
            <div class="grid grid-cols-[90px_130px_60px_60px_130px_80px] gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              <span>Date</span><span>Time</span><span>Req</span><span>Assigned</span><span>Required role</span><span>Status</span>
            </div>
            <div
              v-for="slot in coverageAuditData.slots"
              :key="slot.key"
              class="grid grid-cols-[90px_130px_60px_60px_130px_80px] gap-2 px-3 py-1.5 border-b border-gray-100 last:border-b-0 items-center"
            >
              <span>{{ slot.date }}</span>
              <span class="text-gray-600">{{ slot.start_time }}–{{ slot.end_time }}</span>
              <span>{{ slot.required_count }}</span>
              <span :class="slot.assigned_count >= slot.required_count ? 'text-green-600' : 'text-red-500'">{{ slot.assigned_count }}</span>
              <span class="text-gray-600">{{ slot.required_role || '—' }}</span>
              <span :class="slot.status === 'OK' ? 'text-green-600' : slot.status === 'MISSING_ROLE' ? 'text-purple-600' : 'text-red-500'">{{ slot.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Copy JSON" icon="pi pi-copy" outlined size="small" @click="copyCoverageAuditJson" />
        <Button label="Close" size="small" @click="auditOpen = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Skeleton from 'primevue/skeleton'
import { useCoverageStore } from '../stores/coverageStore'
import { useStoreContext } from '@/stores/storeContext'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { usePublicHolidays } from '@/features/schedule/composables/usePublicHolidays'
import CoverageHeatmap from '../components/CoverageHeatmap.vue'
import CoverageMonthCalendar from '../components/CoverageMonthCalendar.vue'

const coverageStore  = useCoverageStore()
const ctx            = useStoreContext()
const employeeStore  = useEmployeeStore()

// ── View mode ──────────────────────────────────────────────────────────────
const viewMode = ref<'week' | 'month'>('week')

// ── Month state ────────────────────────────────────────────────────────────
function todayYearMonth(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}
const currentMonth = ref(todayYearMonth())

function prevMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  currentMonth.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
function nextMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m, 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  currentMonth.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
})

// ── Unified navigation ─────────────────────────────────────────────────────
function navPrev() { viewMode.value === 'week' ? ctx.prevWeek() : prevMonth() }
function navNext() { viewMode.value === 'week' ? ctx.nextWeek() : nextMonth() }

const weekLabel = computed(() => {
  const start = new Date(`${ctx.weekStart}T00:00:00`)
  const end   = new Date(`${ctx.weekEnd}T00:00:00`)
  // ISO week number: Thursday of the week determines the year.
  const thu = new Date(start); thu.setDate(thu.getDate() + 3)
  const jan1 = new Date(thu.getFullYear(), 0, 1)
  const isoWeek = Math.ceil(((thu.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7)
  const dateRange = `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
  return `S${isoWeek} · ${dateRange}`
})
const navLabel = computed(() => viewMode.value === 'week' ? weekLabel.value : monthLabel.value)

// ── Loading state ──────────────────────────────────────────────────────────
const isLoading = computed(() =>
  viewMode.value === 'week' ? coverageStore.loading : coverageStore.monthLoading
)

// ── Public holidays ────────────────────────────────────────────────────────

// Week holidays — filtered to current week
const weekStartRef = computed(() => ctx.weekStart)
const { holidays: weekHolidays } = usePublicHolidays(weekStartRef)
const weekHolidayMap = computed(() => {
  const m = new Map<string, string>()
  for (const h of weekHolidays.value) {
    if (h.date >= ctx.weekStart && h.date <= ctx.weekEnd) m.set(h.date, h.name)
  }
  return m
})

// Month holidays — keyed to the first day of the displayed month so the year is correct
const monthFirstDayRef = computed(() => `${currentMonth.value}-01`)
const { holidays: monthHolidays } = usePublicHolidays(monthFirstDayRef)
const monthHolidayMap = computed(() => {
  const [y, mNum] = currentMonth.value.split('-').map(Number)
  const firstOfMonth = new Date(y, mNum - 1, 1)
  const dowFirst  = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(y, mNum - 1, 1 - dowFirst)
  const gridEnd   = new Date(gridStart.getTime() + 41 * 86_400_000)

  const gridStartISO = fmtISO(gridStart)
  const gridEndISO   = fmtISO(gridEnd)

  const m = new Map<string, string>()
  for (const h of monthHolidays.value) {
    if (h.date >= gridStartISO && h.date <= gridEndISO) m.set(h.date, h.name)
  }
  return m
})

function fmtISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Dev flag ───────────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV
const auditOpen = ref(false)

// ── Data loading ───────────────────────────────────────────────────────────
function load() {
  if (viewMode.value === 'week') {
    coverageStore.fetchCoverage(ctx.storeId)
  } else {
    loadMonth()
  }
}

function loadMonth() {
  const [y, mNum] = currentMonth.value.split('-').map(Number)
  const firstOfMonth = new Date(y, mNum - 1, 1)
  const dowFirst  = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(y, mNum - 1, 1 - dowFirst)
  const gridEnd   = new Date(gridStart.getTime() + 41 * 86_400_000)
  coverageStore.fetchMonthCoverage(ctx.storeId, fmtISO(gridStart), fmtISO(gridEnd))
}

onMounted(load)
watch(() => ctx.weekStart, () => { if (viewMode.value === 'week') coverageStore.fetchCoverage(ctx.storeId) })
watch(currentMonth, () => { if (viewMode.value === 'month') loadMonth() })
watch(viewMode, load)

// ── Day click (month → week drill-down) ────────────────────────────────────
function onDayClick(iso: string) {
  // Find the Monday of the clicked day's week
  const d = new Date(`${iso}T00:00:00`)
  const dow = (d.getDay() + 6) % 7  // Mon=0
  const monday = new Date(d.getTime() - dow * 86_400_000)
  ctx.setWeek(fmtISO(monday))
  viewMode.value = 'week'
}

// ── Missing role banner ────────────────────────────────────────────────────
const missingRoleNames = computed(() => {
  const roles = new Set<string>()
  for (const slot of coverageStore.items()) {
    if (slot.missing_role && slot.required_role) roles.add(slot.required_role)
  }
  return Array.from(roles)
})

const employeeRoles = computed(() => {
  const roles = new Set<string>()
  for (const e of (employeeStore.employees ?? [])) {
    if (e.job_role) roles.add(e.job_role)
  }
  return Array.from(roles)
})

// ── Coverage audit data (DEV only) ────────────────────────────────────────
const coverageAuditData = computed(() => {
  const slots = coverageStore.items()
  const missingRoles = Array.from(new Set(
    slots.filter(s => s.missing_role && s.required_role).map(s => s.required_role!)
  ))
  return {
    totalSlots:    slots.length,
    gapCount:      slots.filter(s => s.status !== 'OK').length,
    employeeRoles: employeeRoles.value,
    missingRoles,
    slots: slots.map(s => ({
      key:            `${s.date}-${s.start_time}-${s.end_time}`,
      date:           s.date,
      start_time:     s.start_time,
      end_time:       s.end_time,
      status:         s.status,
      required_count: s.required_count,
      assigned_count: s.assigned_count,
      required_role:  s.required_role ?? '',
    })).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)),
  }
})

function copyCoverageAuditJson() {
  const payload = {
    storeId: ctx.storeId,
    generatedAt: new Date().toISOString(),
    ...coverageAuditData.value,
  }
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
}
</script>

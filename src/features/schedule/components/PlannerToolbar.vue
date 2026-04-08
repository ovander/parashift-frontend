<template>
  <div class="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 min-w-0">
    <!-- Week navigation -->
    <Button icon="pi pi-chevron-left" text rounded :aria-label="t('common.back')" @click="ctx.prevWeek()" class="flex-shrink-0 w-9 h-9" />
    <span class="text-sm font-semibold text-gray-800 min-w-0 shrink truncate text-center">{{ weekLabel }}</span>
    <Button icon="pi pi-chevron-right" text rounded @click="ctx.nextWeek()" class="flex-shrink-0 w-9 h-9" />

    <div class="flex-1" />

    <Divider layout="vertical" class="h-5" />

    <!-- AI panel toggle — icon+label on lg+, icon-only with tooltip on smaller screens -->
    <Button
      icon="pi pi-sparkles"
      :label="aiLabel"
      size="small"
      outlined
      v-tooltip.bottom="!aiLabel ? t('ai.suggest') : undefined"
      @click="emit('openAI')"
    />

    <!-- Save indicator -->
    <KSaveBanner :dirty="scheduleStore.dirty as any" />

    <Divider layout="vertical" class="h-5" />

    <!-- Regenerate — icon-only: destructive, needs confirmation, tooltip explains -->
    <Button
      icon="pi pi-refresh"
      size="small"
      severity="warning"
      text
      rounded
      v-tooltip.bottom="'Regenerate: delete all shifts & re-project from A/B templates'"
      @click="confirmRegenerate"
    />

    <!-- Reset week — icon-only: destructive, needs confirmation, tooltip explains -->
    <Button
      icon="pi pi-trash"
      size="small"
      severity="danger"
      text
      rounded
      v-tooltip.bottom="'Reset: clear all assignments for this week'"
      @click="confirmReset"
    />

    <!-- DEV ONLY: Audit trail — icon-only -->
    <template v-if="isDev">
      <Divider layout="vertical" class="h-5" />
      <Button
        icon="pi pi-list-check"
        size="small"
        severity="secondary"
        text
        rounded
        v-tooltip.bottom="'[DEV] Audit trail'"
        @click="auditOpen = true"
      />
    </template>
  </div>

  <!-- Audit trail dialog (DEV only) -->
  <Dialog
    v-if="isDev"
    v-model:visible="auditOpen"
    header="🔍 Planner Audit Trail"
    modal
    :style="{ width: '680px', maxHeight: '80vh' }"
    :pt="{ content: { style: 'overflow-y: auto' } }"
  >
    <div class="font-mono text-xs space-y-4 text-gray-800">
      <!-- Header -->
      <div class="bg-gray-100 rounded p-3 space-y-1">
        <div><span class="text-gray-500">Week:</span> {{ weekLabel }}</div>
        <div><span class="text-gray-500">Store:</span> {{ ctx.storeId }}</div>
        <div><span class="text-gray-500">Generated:</span> {{ new Date().toISOString() }}</div>
      </div>

      <!-- Shifts -->
      <div>
        <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">
          Shifts ({{ auditData.shifts.length }}) — Assignments ({{ auditData.totalAssignments }})
        </div>
        <div
          v-for="s in auditData.shifts"
          :key="s.id"
          class="border border-gray-200 rounded mb-2"
        >
          <div class="bg-gray-50 px-3 py-1.5 flex items-center gap-3 border-b border-gray-200">
            <span class="font-semibold">{{ s.date }} {{ s.start }}–{{ s.end }}</span>
            <span v-if="s.role" class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{{ s.role }}</span>
            <span class="text-gray-400">min {{ s.minStaff }} staff</span>
            <span :class="s.assigned >= s.minStaff ? 'text-green-600' : 'text-red-500'" class="ml-auto">
              {{ s.assigned }}/{{ s.minStaff }} assigned
            </span>
          </div>
          <div v-if="s.employees.length" class="divide-y divide-gray-100">
            <div
              v-for="emp in s.employees"
              :key="emp.id"
              class="px-3 py-1 flex items-center gap-2"
            >
              <i class="pi pi-user text-gray-400 text-[10px]" />
              <span>{{ emp.name }}</span>
              <span class="text-gray-400">{{ emp.job_role }}</span>
              <span
                v-if="s.role && emp.job_role !== s.role"
                class="text-amber-600 ml-auto"
              >⚠ role mismatch</span>
            </div>
          </div>
          <div v-else class="px-3 py-1 text-gray-400 italic">No assignments</div>
        </div>
      </div>

      <!-- Coverage gaps -->
      <div v-if="auditData.gaps.length">
        <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">
          Coverage gaps ({{ auditData.gaps.length }})
        </div>
        <div
          v-for="g in auditData.gaps"
          :key="g.label"
          class="flex items-center gap-2 text-red-600 py-0.5"
        >
          <i class="pi pi-exclamation-triangle text-[10px]" />
          {{ g.label }}
        </div>
      </div>
      <div v-else class="text-green-600">✓ No coverage gaps</div>
    </div>

    <template #footer>
      <Button label="Copy JSON" icon="pi pi-copy" outlined size="small" @click="copyAuditJson" />
      <Button label="Close" size="small" @click="auditOpen = false" />
    </template>
  </Dialog>

  <!-- Reset week confirmation dialog -->
  <ConfirmDialog group="resetWeek" />

  <!-- Regenerate confirmation dialog -->
  <ConfirmDialog group="regenerateWeek" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useStoreContext } from '@/stores/storeContext'
import { useScheduleStore } from '../stores/scheduleStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useCoverageStore } from '@/features/coverage/stores/coverageStore'
import KSaveBanner from '@/components/KSaveBanner.vue'

const { t } = useI18n()
const ctx           = useStoreContext()
const scheduleStore = useScheduleStore()
const employeeStore = useEmployeeStore()
const coverageStore = useCoverageStore()
const confirm       = useConfirm()

// ── Dev flag ───────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV

// ── AI button label: text on lg+, undefined (icon-only) on smaller screens ─
const isLargeScreen = ref(window.innerWidth >= 1024)
function updateScreenSize() { isLargeScreen.value = window.innerWidth >= 1024 }
onMounted(()  => window.addEventListener('resize', updateScreenSize))
onUnmounted(() => window.removeEventListener('resize', updateScreenSize))
const aiLabel = computed(() => isLargeScreen.value ? t('ai.suggest') : undefined)

// ── Reset week ─────────────────────────────────────────────────────────
function confirmReset() {
  confirm.require({
    group:   'resetWeek',
    header:  'Reset week assignments',
    message: `This will permanently remove all assignments for the week of ${weekLabel.value}. Shift templates are not affected. Continue?`,
    icon:    'pi pi-exclamation-triangle',
    rejectLabel:  'Cancel',
    acceptLabel:  'Yes, reset',
    acceptClass:  'p-button-danger',
    accept: async () => {
      try {
        await scheduleStore.resetWeek(ctx.storeId, ctx.weekStart)
      } catch {
        // error toast already shown by the store
      }
    },
  })
}

// ── Regenerate week ────────────────────────────────────────────────────
function confirmRegenerate() {
  confirm.require({
    group:   'regenerateWeek',
    header:  'Regenerate schedule',
    message: `This will delete ALL shifts and assignments for the week of ${weekLabel.value} and re-project from A/B templates. Manual shifts will be lost. Continue?`,
    icon:    'pi pi-refresh',
    rejectLabel:  'Cancel',
    acceptLabel:  'Yes, regenerate',
    acceptClass:  'p-button-warning',
    accept: async () => {
      try {
        await scheduleStore.regenerateWeek(ctx.storeId, ctx.weekStart)
      } catch {
        // error toast already shown by the store
      }
    },
  })
}

const emit = defineEmits<{ (e: 'openAI'): void }>()

// ── Audit trail (DEV only) ─────────────────────────────────────────────
const auditOpen = ref(false)

const auditData = computed(() => {
  const empMap = Object.fromEntries((employeeStore.employees ?? []).map(e => [e.id, e]))

  const shifts = (scheduleStore.shifts ?? []).map(s => {
    const assigned = (scheduleStore.assignments ?? []).filter(a => a.shift_id === s.id)
    return {
      id:        s.id,
      date:      s.date,
      start:     s.start_time,
      end:       s.end_time,
      role:      s.role ?? '',
      minStaff:  s.required_count ?? 1,
      assigned:  assigned.length,
      employees: assigned.map(a => {
        const emp = empMap[a.employee_id]
        return { id: a.employee_id, name: emp?.name ?? a.employee_id, job_role: emp?.job_role ?? '?' }
      }),
    }
  }).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))

  const gaps = coverageStore.items()
    .filter(g => g.status !== 'OK')
    .map(g => ({
      label: `${g.date} ${g.start_time}–${g.end_time} — ${g.assigned_count}/${g.required_count} staff${g.required_role ? ` · needs ${g.required_role}` : ''}`,
    }))

  const shiftIds = new Set(shifts.map(s => s.id))
  const weekAssignments = (scheduleStore.assignments ?? []).filter(a => shiftIds.has(a.shift_id))

  return { shifts, gaps, totalAssignments: weekAssignments.length }
})

function copyAuditJson() {
  const payload = {
    week:    { start: ctx.weekStart, end: ctx.weekEnd },
    storeId: ctx.storeId,
    generatedAt: new Date().toISOString(),
    ...auditData.value,
  }
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
}

// ── Week label ─────────────────────────────────────────────────────────
function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

const weekLabel = computed(() => {
  // Parse as local midnight so the displayed label is never 1 day early in UTC+ timezones.
  const start = new Date(ctx.weekStart + 'T00:00:00')
  const end   = new Date(ctx.weekEnd   + 'T00:00:00')
  const weekNum = isoWeekNumber(start)
  return `Week ${weekNum} · ${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
})

</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6 space-y-4">
    <!-- Swap inbox -->
    <SwapInboxCard />

    <!-- Week header -->
    <div class="flex items-center justify-between">
      <Button icon="pi pi-chevron-left" text rounded @click="ctx.prevWeek()" />
      <span class="font-semibold text-gray-800">
        {{ weekLabel }}
        <!-- [DEV] audit-trail toggle badge -->
        <button
          v-if="isDev"
          class="ml-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border align-middle transition-colors"
          :class="devAuditOpen
            ? 'bg-violet-100 text-violet-700 border-violet-300'
            : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-violet-50 hover:text-violet-600'"
          @click="devAuditOpen = !devAuditOpen"
        >[audit]</button>
      </span>
      <Button icon="pi pi-chevron-right" text rounded @click="ctx.nextWeek()" />
    </div>

    <!-- [DEV] Audit trail panel ──────────────────────────────────────────── -->
    <div
      v-if="isDev && devAuditOpen"
      class="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden"
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-violet-200">
        <span class="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
          <i class="pi pi-list-check" /> Audit trail — dev only
        </span>
        <button
          class="text-xs text-violet-500 hover:text-violet-700 font-medium px-2 py-0.5 rounded hover:bg-violet-100 transition-colors"
          @click="copyAudit"
        >{{ copyLabel }}</button>
      </div>
      <pre class="text-[11px] font-mono text-gray-700 whitespace-pre overflow-x-auto leading-relaxed p-3 max-h-80 overflow-y-auto">{{ devAuditText }}</pre>
    </div>

    <!-- Loading -->
    <div v-if="scheduleStore.loading" class="space-y-2">
      <Skeleton v-for="i in 7" :key="i" height="72px" border-radius="12px" />
    </div>

    <!-- Week strip + shift detail -->
    <WeekStrip v-else :store-id="ctx.storeId" />

    <!-- Action buttons -->
    <div class="pt-4 space-y-2">
      <Button
        :label="t('leave.request')"
        icon="pi pi-calendar-plus"
        fluid
        outlined
        @click="leaveFormOpen = true"
      />
      <MonthSchedulePdf />
    </div>

    <LeaveRequestForm v-model:visible="leaveFormOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { useStoreContext } from '@/stores/storeContext'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useSwapStore } from '@/features/swap/stores/swapStore'
import { useLeaveStore } from '@/features/leave/stores/leaveStore'
import { useAuthStore } from '@/stores/auth'
import WeekStrip from '../components/WeekStrip.vue'
import SwapInboxCard from '@/features/swap/components/SwapInboxCard.vue'
import LeaveRequestForm from '@/features/leave/components/LeaveRequestForm.vue'
import MonthSchedulePdf from '../components/MonthSchedulePdf.vue'

const { t }          = useI18n()
const ctx            = useStoreContext()
const scheduleStore  = useScheduleStore()
const employeeStore  = useEmployeeStore()
const swapStore      = useSwapStore()
const leaveStore     = useLeaveStore()
const auth           = useAuthStore()
const leaveFormOpen  = ref(false)

// ── Dev-only flag ─────────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV

function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

/** Timezone-safe ISO date — avoids UTC offset shifting midnight to the previous day. */
function localIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const weekLabel = computed(() => {
  const s = new Date(ctx.weekStart + 'T00:00:00')
  const e = new Date(ctx.weekEnd   + 'T00:00:00')
  const weekNum = isoWeekNumber(s)
  return `Week ${weekNum} · ${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
})

// ── [DEV] Audit trail ─────────────────────────────────────────────────────────

/**
 * Compute A/B week type using the same algorithm as the backend WeekType():
 * compare the ISO week-number parity of weekStart vs. startDate.
 * Any week with the same odd/even parity as the employee's start_date = A;
 * the opposite parity = B.  This matches the global calendar — every day in
 * a Mon–Sun ISO week inherently shares the same week number, so no Monday
 * normalisation is needed.
 */
function computeWeekType(weekStartIso: string, startDateIso: string): 'A' | 'B' {
  const weekNum  = isoWeekNumber(new Date(weekStartIso  + 'T00:00:00'))
  const startNum = isoWeekNumber(new Date(startDateIso  + 'T00:00:00'))
  return weekNum % 2 === startNum % 2 ? 'A' : 'B'
}

const devAuditOpen = ref(false)
const copyLabel    = ref('Copy')

/** Build a full plaintext audit trail for the current employee's week. */
const devAuditText = computed(() => {
  const emp = auth.user
  if (!emp) return '(no auth user)'

  // AuthUser is a slim projection — look up the full Employee record for start_date.
  const fullEmp   = employeeStore.employees.find((e) => e.id === emp.id)
  const startDate = fullEmp?.start_date ?? null

  const weekType = startDate
    ? computeWeekType(ctx.weekStart, startDate)
    : '? (start_date not loaded)'

  const startWeekNum = startDate
    ? isoWeekNumber(new Date(startDate + 'T00:00:00'))
    : null
  const anchorNote = startWeekNum !== null
    ? `ISO week ${startWeekNum} (${startWeekNum % 2 === 1 ? 'odd' : 'even'}) → A = ${startWeekNum % 2 === 1 ? 'odd' : 'even'} weeks, B = ${startWeekNum % 2 === 1 ? 'even' : 'odd'} weeks`
    : '—'

  const SEP = '─'.repeat(54)
  const lines: string[] = []

  lines.push(SEP)
  lines.push('EMPLOYEE WEEK SCHEDULE — AUDIT TRAIL')
  lines.push(`Generated : ${new Date().toISOString()}`)
  lines.push(SEP)
  lines.push(`Employee  : ${emp.name}`)
  lines.push(`ID        : ${emp.id}`)
  lines.push(`Role      : ${emp.job_role ?? '—'}  (${emp.position})`)
  lines.push(`Store     : ${ctx.storeId}`)
  lines.push(`Start date: ${startDate ?? '—'}`)
  lines.push(`A/B rule  : ${anchorNote}`)
  lines.push(`Week      : ${ctx.weekStart} → ${ctx.weekEnd}  [Week ${weekType}]`)
  lines.push(SEP)
  lines.push('DAILY SCHEDULE')
  lines.push('')

  // Build a map of ISO date → approved leave type for the current employee.
  const leaveMap = new Map<string, string>()
  for (const leave of leaveStore.leaves) {
    if (leave.employee_id !== emp.id || leave.status !== 'approved') continue
    const s = new Date(`${leave.start_date}T00:00:00`)
    const e = new Date(`${leave.end_date}T00:00:00`)
    const cur = new Date(s)
    while (cur <= e) {
      leaveMap.set(localIso(cur), leave.type)
      cur.setDate(cur.getDate() + 1)
    }
  }

  let totalMinutes   = 0
  let totalShifts    = 0
  let confirmedCount = 0
  const violations: string[] = []
  const conflicts:  string[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(ctx.weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const iso = localIso(d)
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      .padEnd(14)

    const leaveType = leaveMap.get(iso) ?? null
    const myAssns = scheduleStore.assignments.filter(
      (a) => a.employee_id === emp.id && a.shift_date === iso,
    )

    if (myAssns.length === 0) {
      if (leaveType) {
        lines.push(`  ${dayLabel}  🌴  (approved ${leaveType})`)
      } else {
        lines.push(`  ${dayLabel}  —  (day off)`)
      }
      continue
    }

    for (const assn of myAssns) {
      const shift = scheduleStore.shifts.find((s) => s.id === assn.shift_id)
      if (!shift) {
        lines.push(`  ${dayLabel}  ?  (shift ${assn.shift_id.slice(0, 8)} not loaded)`)
        continue
      }

      totalShifts++
      const [sh, sm] = shift.start_time.split(':').map(Number)
      const [eh, em] = shift.end_time.split(':').map(Number)
      totalMinutes += (eh * 60 + em) - (sh * 60 + sm)
      const acked = assn.acknowledged_at ? `  ✓ confirmed ${assn.acknowledged_at.slice(0, 10)}` : ''
      if (assn.acknowledged_at) confirmedCount++

      const employee = employeeStore.employees.find((e) => e.id === assn.employee_id)
      const contract = employee?.contract_hours_per_week
        ? `  contract ${employee.contract_hours_per_week}h/wk`
        : ''

      const leaveFlag = leaveType ? `  ⚠ LEAVE CONFLICT (${leaveType})` : ''

      lines.push(
        `  ${dayLabel}  ●  ${shift.start_time}–${shift.end_time}` +
        `  ${shift.role.padEnd(20)}  [${shift.status}]${acked}${contract}${leaveFlag}`,
      )

      if (leaveType) {
        conflicts.push(`  [LEAVE] ${dayLabel.trim()}: scheduled during approved ${leaveType}`)
      }

      // Inline violations
      for (const v of assn.violations) {
        lines.push(`      ⚠  [${v.severity}] ${v.message}`)
        violations.push(`  [${v.severity}] ${dayLabel.trim()}: ${v.message}`)
      }
    }
  }

  lines.push('')
  lines.push(SEP)
  lines.push('SUMMARY')
  lines.push('')
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  lines.push(`  Shifts worked  : ${totalShifts}`)
  lines.push(`  Total hours    : ${hh}h${mm > 0 ? ` ${mm}m` : ''}`)
  lines.push(`  Confirmed      : ${confirmedCount} / ${totalShifts}`)
  lines.push(`  Violations     : ${violations.length}`)
  lines.push(`  Leave conflicts: ${conflicts.length}`)

  if (conflicts.length > 0) {
    lines.push('')
    lines.push(SEP)
    lines.push('⚠ LEAVE CONFLICTS — shifts scheduled during approved leave')
    lines.push('')
    lines.push(...conflicts)
  }

  if (violations.length > 0) {
    lines.push('')
    lines.push(SEP)
    lines.push('VIOLATIONS')
    lines.push('')
    lines.push(...violations)
  }

  lines.push('')
  lines.push(SEP)

  return lines.join('\n')
})

async function copyAudit() {
  await navigator.clipboard.writeText(devAuditText.value)
  copyLabel.value = 'Copied!'
  setTimeout(() => { copyLabel.value = 'Copy' }, 1500)
}

async function loadData() {
  await Promise.all([
    scheduleStore.fetchWeek(ctx.storeId, ctx.weekStart),
    employeeStore.fetchEmployees(ctx.storeId),
    swapStore.fetchSwaps(ctx.storeId),
    leaveStore.fetchLeave(ctx.storeId),
  ])
}

onMounted(loadData)
watch(() => ctx.weekStart, loadData)
</script>

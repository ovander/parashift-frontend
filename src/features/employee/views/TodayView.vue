<template>
  <div class="flex flex-col h-full bg-gray-100">

    <!-- ── Header ─────────────────────────────────────────────────────── -->
    <header class="bg-white border-b px-4 py-3 flex items-center justify-between">
      <h1 class="font-semibold text-gray-900">{{ t('schedule.today') }}</h1>
      <span class="text-sm text-gray-500">{{ todayFormatted }}</span>
    </header>

    <!-- ── Swap alert (Sprint 1.3: real count from swapStore) ─────────── -->
    <div v-if="swapStore.pendingIncoming.length > 0" class="mx-4 mt-3">
      <div class="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
        <i class="pi pi-exclamation-circle text-orange-500" />
        <span class="text-orange-800">
          {{ t('swap.pendingCount', swapStore.pendingIncoming.length, { n: swapStore.pendingIncoming.length }) }}
        </span>
        <button class="ml-auto text-orange-600 font-medium text-xs" @click="mobileTab = 'requests'">
          {{ t('swap.review') }}
        </button>
      </div>
    </div>

    <!-- ══════════════ TAB PANELS ═══════════════════════════════════════ -->

    <!-- TODAY ─────────────────────────────────────────────────────────── -->
    <div v-show="mobileTab === 'today'" class="flex-1 overflow-y-auto p-4 space-y-3" data-testid="today-panel">
      <!-- Sprint 2.1: skeleton loader -->
      <template v-if="scheduleStore.loading">
        <Skeleton v-for="i in 3" :key="i" height="100px" border-radius="12px" />
      </template>

      <template v-else>
        <!-- Approved leave banner (shown even when shifts are present) -->
        <div v-if="todayLeave" class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
          <i class="pi pi-sun text-2xl block mb-1 text-emerald-500" />
          <p class="font-semibold text-emerald-700 capitalize">{{ todayLeave }}</p>
          <p class="text-xs text-emerald-500 mt-0.5">{{ t('schedule.approvedLeave') }}</p>
        </div>

        <!-- Conflict warning: on leave but still scheduled -->
        <div v-if="todayLeave && todayShifts.length > 0" class="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 flex items-center gap-2 text-xs text-orange-800">
          <i class="pi pi-exclamation-triangle text-orange-500 flex-shrink-0" />
          {{ t('schedule.leaveConflictWarning') }}
        </div>

        <!-- No shift today (and no leave) → show holiday name, or a simple "day off" message -->
        <div v-if="todayShifts.length === 0 && !todayLeave" class="text-center py-12">
          <template v-if="todayHoliday">
            <i class="pi pi-star text-3xl block mb-3 text-amber-400" />
            <p class="font-semibold text-amber-700 text-base">{{ todayHoliday }}</p>
            <p class="text-sm text-amber-500 mt-1">{{ t('schedule.publicHoliday') }}</p>
          </template>
          <template v-else>
            <i class="pi pi-sun text-3xl block mb-3 text-gray-300" />
            <p class="text-gray-400">{{ t('schedule.dayOff') }}</p>
          </template>
        </div>

        <div
          v-for="shift in todayShifts"
          :key="shift.id"
          :class="['bg-white rounded-xl shadow-sm border p-4', todayLeave ? 'opacity-60' : '']"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="font-semibold text-gray-900">{{ shift.start_time }} – {{ shift.end_time }}</p>
              <p class="text-sm text-gray-500 capitalize mt-0.5">{{ shift.role }}</p>
            </div>
            <Tag :severity="shift.status === 'PUBLISHED' ? 'success' : 'warning'" :value="shift.status" />
          </div>

          <div class="mt-3 space-y-2">
            <div
              v-for="a in getAssignments(shift.id)"
              :key="a.id"
              class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
                  {{ getInitials(a.employee_id) }}
                </div>
                <span class="text-sm text-gray-800">{{ getEmployeeName(a.employee_id) }}</span>
              </div>
              <!-- Sprint 1.1: Replace only for managers -->
              <button
                v-if="isManager"
                class="text-xs text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50"
                @click="showEmergencyReplace(shift, a)"
              >
                {{ t('schedule.todayView.replace') }}
              </button>
            </div>

            <!-- Sprint 1.1: Quick assign only for managers -->
            <button
              v-if="isManager && getAssignments(shift.id).length < shift.required_count"
              class="w-full text-sm text-brand-600 font-medium border-2 border-dashed border-brand-200 rounded-lg py-2 hover:bg-brand-50 transition-colors"
              @click="showQuickAssign(shift)"
            >
              <i class="pi pi-plus mr-1" /> {{ t('schedule.todayView.assignEmployee') }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- WEEK ──────────────────────────────────────────────────────────── -->
    <div v-show="mobileTab === 'week'" class="flex-1 overflow-y-auto p-4">
      <!-- Mini week nav header -->
      <div class="flex items-center justify-between mb-4">
        <Button icon="pi pi-chevron-left" text rounded size="small" @click="ctx.prevWeek()" />
        <span class="text-sm font-semibold text-gray-800">
          {{ weekLabel }}
          <span v-if="devWeekType" class="ml-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">[{{ devWeekType }}]</span>
        </span>
        <Button icon="pi pi-chevron-right" text rounded size="small" @click="ctx.nextWeek()" />
      </div>
      <WeekStrip :store-id="ctx.storeId" />
    </div>

    <!-- TEAM ──────────────────────────────────────────────────────────── -->
    <div v-show="mobileTab === 'team'" class="flex-1 overflow-y-auto p-4 space-y-3" data-testid="team-panel">
      <template v-if="scheduleStore.loading">
        <Skeleton v-for="i in 3" :key="i" height="80px" border-radius="12px" />
      </template>
      <template v-else>
        <div v-if="teamToday.length === 0" class="text-center py-12 text-gray-400">
          <i class="pi pi-users text-3xl block mb-3" />
          <p>{{ t('schedule.todayView.noOneOnShift') }}</p>
        </div>
        <div
          v-for="entry in teamToday"
          :key="entry.shift.id"
          class="bg-white rounded-xl shadow-sm border p-4"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase mb-2">
            {{ entry.shift.start_time }} – {{ entry.shift.end_time }}
            <span class="capitalize font-normal text-gray-400 ml-1">· {{ entry.shift.role }}</span>
          </p>
          <div class="space-y-1.5">
            <div v-for="emp in entry.employees" :key="emp.id" class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
                {{ initials(emp.name) }}
              </div>
              <span class="text-sm text-gray-800">{{ emp.name }}</span>
              <span class="text-xs text-gray-400 capitalize ml-auto">{{ emp.job_role }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- REQUESTS ──────────────────────────────────────────────────────── -->
    <div v-show="mobileTab === 'requests'" class="flex-1 overflow-y-auto p-4 space-y-4" data-testid="requests-panel">
      <!-- Swap inbox (existing component — only renders when there are pending swaps) -->
      <SwapInboxCard />

      <!-- My leave requests -->
      <div class="space-y-2">
        <h3 class="text-sm font-semibold text-gray-700">{{ t('schedule.todayView.myLeaveRequests') }}</h3>

        <div v-if="leaveStore.loading" class="space-y-2">
          <Skeleton v-for="i in 2" :key="i" height="56px" border-radius="12px" />
        </div>
        <div v-else-if="myLeaves.length === 0" class="text-center py-6 text-gray-400 text-sm">
          {{ t('schedule.todayView.noLeaveYet') }}
        </div>
        <div
          v-else
          v-for="leave in myLeaves"
          :key="leave.id"
          class="bg-white rounded-xl border p-3 flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-800">{{ t(`leave.type.${leave.type}`, leave.type) }}</p>
            <p class="text-xs text-gray-500">{{ leave.start_date }} – {{ leave.end_date }}</p>
            <p v-if="leave.reason" class="text-xs text-gray-400 italic mt-0.5 truncate">{{ leave.reason }}</p>
          </div>
          <Tag
            :severity="leaveStatusSeverity(leave.status)"
            :value="leave.status"
            class="flex-shrink-0 text-xs capitalize"
          />
        </div>
      </div>

      <Button
        :label="t('leave.request')"
        icon="pi pi-calendar-plus"
        fluid
        outlined
        @click="leaveFormOpen = true"
      />
    </div>

    <!-- ── Bottom tab bar ──────────────────────────────────────────────── -->
    <nav class="bg-white border-t flex" :style="{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }" data-testid="tab-bar">
      <button
        v-for="tab in mobileTabs"
        :key="tab.id"
        class="flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors"
        :class="mobileTab === tab.id ? 'text-brand-600' : 'text-gray-400'"
        @click="mobileTab = tab.id"
      >
        <i :class="tab.icon" class="text-lg" />
        <span class="text-xs">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- ── Quick assign bottom sheet ───────────────────────────────────── -->
    <Drawer v-model:visible="quickAssignVisible" position="bottom" :style="{ height: '60vh' }">
      <template #header>
        <span class="font-semibold">{{ t('schedule.todayView.quickAssign') }}</span>
      </template>
      <QuickAssignSheet
        v-if="selectedShift"
        :shift="selectedShift"
        @assigned="quickAssignVisible = false"
      />
    </Drawer>

    <LeaveRequestForm v-model:visible="leaveFormOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import { fmtLocal } from '@/utils/dateUtils'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useSwapStore } from '@/features/swap/stores/swapStore'
import { useLeaveStore } from '@/features/leave/stores/leaveStore'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/stores/storeContext'
import { usePublicHolidays } from '@/features/schedule/composables/usePublicHolidays'
import SwapInboxCard from '@/features/swap/components/SwapInboxCard.vue'
import LeaveRequestForm from '@/features/leave/components/LeaveRequestForm.vue'
import WeekStrip from '../components/WeekStrip.vue'
import QuickAssignSheet from '../components/QuickAssignSheet.vue'
import type { ShiftInstance, Assignment, LeaveStatus } from '@/types'

const { t }         = useI18n()
const { locale }    = useLocale()
const scheduleStore = useScheduleStore()
const employeeStore = useEmployeeStore()
const swapStore     = useSwapStore()
const leaveStore    = useLeaveStore()
const auth          = useAuthStore()
const ctx           = useStoreContext()

// ── Sprint 1.1: role gate ─────────────────────────────────────────────
const isManager = computed(() =>
  auth.user?.position === 'manager' || auth.user?.position === 'admin',
)

// ── Tabs ──────────────────────────────────────────────────────────────
const mobileTab = ref<'today' | 'week' | 'team' | 'requests'>('today')

const mobileTabs = computed(() => [
  { id: 'today'    as const, label: t('schedule.today'),    icon: 'pi pi-sun' },
  { id: 'week'     as const, label: t('schedule.week'),     icon: 'pi pi-calendar' },
  { id: 'team'     as const, label: t('employee.team'),     icon: 'pi pi-users' },
  { id: 'requests' as const, label: t('swap.requests'),     icon: 'pi pi-inbox' },
])

// ── Date helpers ──────────────────────────────────────────────────────
const today = fmtLocal(new Date())

// Public holidays for the current week (covers today)
const weekStartRef           = computed(() => ctx.weekStart)
const { holidays }           = usePublicHolidays(weekStartRef)
const todayHoliday           = computed(() =>
  holidays.value.find((h) => h.date === today)?.name ?? null,
)

// Sprint 3.3: removed hardcoded 'en-GB', uses system locale
const todayFormatted = computed(() =>
  new Date().toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
)

function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

const weekLabel = computed(() => {
  const s = new Date(ctx.weekStart + 'T00:00:00')
  const e = new Date(ctx.weekEnd   + 'T00:00:00')
  return `W${isoWeekNumber(s)} · ${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
})

// ── [DEV] A/B week type indicator ─────────────────────────────────────────────
// Mirrors the backend WeekType() algorithm: compare ISO week-number parity of
// the current week vs. the employee's start_date. Same parity = A, opposite = B.
const devWeekType = computed((): 'A' | 'B' | null => {
  if (!import.meta.env.DEV) return null
  const employee = employeeStore.employees?.find((e) => e.id === auth.user?.id)
  if (!employee?.start_date || !ctx.weekStart) return null
  const weekNum  = isoWeekNumber(new Date(ctx.weekStart         + 'T00:00:00'))
  const startNum = isoWeekNumber(new Date(employee.start_date   + 'T00:00:00'))
  return weekNum % 2 === startNum % 2 ? 'A' : 'B'
})

// ── Helpers ───────────────────────────────────────────────────────────
function getAssignments(shiftId: string): Assignment[] {
  return scheduleStore.assignments.filter((a) => a.shift_id === shiftId)
}

function getEmployeeName(empId: string): string {
  return employeeStore.employees?.find((e) => e.id === empId)?.name ?? empId.slice(0, 8)
}

function getInitials(empId: string): string {
  return initials(getEmployeeName(empId))
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

// ── TODAY: employees see only their own shifts ───────────────────────
const todayShifts = computed(() => {
  const all = scheduleStore.shifts.filter((s) => s.date === today)
  if (isManager.value) return all
  const myShiftIds = new Set(
    scheduleStore.assignments
      .filter((a) => a.employee_id === auth.user?.id && a.shift_date === today)
      .map((a) => a.shift_id),
  )
  return all.filter((s) => myShiftIds.has(s.id))
})

// ── TEAM: all shifts today with assigned employees ───────────────────
const teamToday = computed(() =>
  scheduleStore.shifts
    .filter((s) => s.date === today)
    .map((shift) => ({
      shift,
      employees: getAssignments(shift.id)
        .map((a) => employeeStore.employees.find((e) => e.id === a.employee_id))
        .filter(Boolean) as NonNullable<ReturnType<typeof employeeStore.employees.find>>[],
    }))
    .filter((e) => e.employees.length > 0),
)

// ── REQUESTS: current user's leave requests ──────────────────────────
const myLeaves = computed(() =>
  leaveStore.leaves.filter((l) => l.employee_id === auth.user?.id),
)

/** Leave type (e.g. 'vacation') if today falls within an approved leave, else null. */
const todayLeave = computed((): string | null => {
  for (const leave of myLeaves.value) {
    if (leave.status !== 'approved') continue
    if (leave.start_date <= today && today <= leave.end_date) return leave.type
  }
  return null
})

function leaveStatusSeverity(status: LeaveStatus): 'info' | 'success' | 'danger' | 'warn' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warn'
}

// ── Quick assign / replace ───────────────────────────────────────────
const quickAssignVisible = ref(false)
const selectedShift      = ref<ShiftInstance | null>(null)
const leaveFormOpen      = ref(false)

function showQuickAssign(shift: ShiftInstance) {
  selectedShift.value      = shift
  quickAssignVisible.value = true
}

function showEmergencyReplace(shift: ShiftInstance, _assignment: Assignment) {
  selectedShift.value      = shift
  quickAssignVisible.value = true
}

// ── Data load ─────────────────────────────────────────────────────────
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

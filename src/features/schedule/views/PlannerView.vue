<template>
  <div class="flex flex-col h-full bg-gray-50">
    <PlannerToolbar @open-a-i="aiPanelOpen = true" />

    <!-- Coverage alert -->
    <CoverageAlertBanner v-if="coverageStore.hasGaps()" :store-id="ctx.storeId" />

    <!-- Main content -->
    <div class="flex flex-1 min-h-0">
      <!-- Calendar -->
      <div class="flex-1 overflow-hidden p-2">
        <div v-if="scheduleStore.loading" class="space-y-3 p-2">
          <Skeleton height="60px" v-for="i in 6" :key="i" />
        </div>
        <FullCalendar v-else :options="calendarOptions" class="h-full">
          <template #eventContent="{ event }">
            <ShiftEventContent :event="event" />
          </template>
        </FullCalendar>
      </div>
    </div>

    <!-- AI panel drawer -->
    <Drawer v-model:visible="aiPanelOpen" position="right" :style="{ width: '420px' }">
      <template #header>
        <span class="font-semibold flex items-center gap-2">
          <i class="pi pi-sparkles text-brand-500" /> AI Assistant
        </span>
      </template>
      <AIPanel :store-id="ctx.storeId" />
    </Drawer>

    <!-- Violation toast -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FullCalendar from '@fullcalendar/vue3'
import Drawer from 'primevue/drawer'
import Skeleton from 'primevue/skeleton'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

import { useStoreContext } from '@/stores/storeContext'
import { useScheduleStore, BlockingViolationError } from '../stores/scheduleStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useCoverageStore } from '@/features/coverage/stores/coverageStore'
import { useLeaveStore } from '@/features/leave/stores/leaveStore'
import { usePlannerCalendar } from '../composables/usePlannerCalendar'
import { usePublicHolidays } from '../composables/usePublicHolidays'
import { useRuleViolations } from '../composables/useRuleViolations'

import PlannerToolbar       from '../components/PlannerToolbar.vue'
import ShiftEventContent    from '../components/ShiftEventContent.vue'
import CoverageAlertBanner  from '@/features/coverage/components/CoverageAlertBanner.vue'
import AIPanel              from '@/features/ai/components/AIPanel.vue'

const { t }      = useI18n()
const toast      = useToast()
const ctx        = useStoreContext()
const scheduleStore  = useScheduleStore()
const employeeStore  = useEmployeeStore()
const coverageStore  = useCoverageStore()
const leaveStore     = useLeaveStore()
const rv             = useRuleViolations()

const aiPanelOpen = ref(false)

// Public holidays — fetched once per year, cached in memory
const weekStartRef   = computed(() => ctx.weekStart)
const { holidays }   = usePublicHolidays(weekStartRef)

async function handleAssign(shiftId: string, employeeId: string, revert: () => void) {
  try {
    const violations = await scheduleStore.assign(ctx.storeId, shiftId, employeeId)
    if (violations.some((v) => v.severity === 'WARNING')) {
      toast.add({ severity: 'warn', summary: 'Soft rule warning', detail: violations.find((v) => v.severity === 'WARNING')!.message, life: 4_000 })
    }
  } catch (err) {
    // Always snap the drag back — the store has already rolled back its own state.
    revert()
    if (err instanceof BlockingViolationError) {
      toast.add({ severity: 'error', summary: 'Assignment blocked', detail: err.violations[0]?.message ?? 'Blocking rule violation', life: 5_000 })
    }
    // Non-blocking errors (holiday block, conflict, network…) are toasted by the
    // store itself via ui.showToast — no duplicate toast needed here.
  }
}

const { calendarOptions } = usePlannerCalendar({
  storeId:      computed(() => ctx.storeId),
  weekStart:    computed(() => ctx.weekStart),
  employees:    computed(() => employeeStore.employees ?? []),
  shifts:       computed(() => scheduleStore.shifts),
  assignments:  computed(() => scheduleStore.assignments),
  holidays,
  exceptions:   computed(() => scheduleStore.exceptions),
  leaves:       computed(() => leaveStore.leaves),
  onAssign:     handleAssign,
  // Keep ctx in sync when FullCalendar's own prev/next/today/view buttons are used.
  onWeekChange: (monday) => ctx.setWeek(monday),
})

async function loadWeek() {
  if (!ctx.storeId) return
  await Promise.all([
    employeeStore.fetchEmployees(ctx.storeId),
    scheduleStore.fetchWeek(ctx.storeId, ctx.weekStart),
    coverageStore.fetchCoverage(ctx.storeId),
    leaveStore.fetchLeave(ctx.storeId),
  ])
}

onMounted(loadWeek)
watch(() => ctx.weekStart, loadWeek)
</script>

<style>
/*
 * The global style.css sets h2 { color: var(--text-h); font-size: 24px; margin: 0 0 8px }
 * and in dark OS mode --text-h becomes near-white (#f3f4f6), making the title invisible
 * on FC's always-white (#fff) background. Override specifically for the toolbar title so
 * it stays dark and readable regardless of the host app's color scheme.
 */
.fc .fc-toolbar-title {
  color:       #1e293b !important; /* slate-800 — readable on FC's white bg */
  font-size:   1.2rem  !important;
  font-weight: 600     !important;
  margin:      0       !important;
  line-height: 1.5     !important;
}

/*
 * Public holidays: diagonal slate stripes signal "no work today".
 *
 * Primary styling is applied via inline styles in handleEventDidMount
 * (usePlannerCalendar.ts) because FC's default opacity:0.3 on .fc-bg-event
 * makes class-only approaches invisible. These CSS rules are a belt-and-
 * suspenders fallback with !important to ensure they win over FC's
 * `background` shorthand and opacity variable even if inline styles are lost.
 */
.fc .fc-holiday.fc-bg-event {
  opacity:          1 !important;
  background-color: transparent !important;
  background-image: repeating-linear-gradient(
    -45deg,
    #cbd5e1 0px,
    #cbd5e1 5px,
    transparent 5px,
    transparent 14px
  ) !important;
}

/*
 * Approved leave: solid emerald-100 band on the employee's column,
 * with a label injected by handleEventDidMount ("🌴 Vacation" etc.).
 */
.fc .fc-leave.fc-bg-event {
  opacity:          0.75 !important;
  background-color: #d1fae5 !important; /* emerald-100 */
}
</style>

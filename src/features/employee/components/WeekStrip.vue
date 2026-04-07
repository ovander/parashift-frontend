<template>
  <div>
    <!-- ── Day card row ─────────────────────────────────────────────────── -->
    <div class="overflow-x-auto">
      <div class="flex gap-2 pb-2" ref="stripRef">
        <!-- Loading skeleton cards -->
        <template v-if="schedStore.loading">
          <Skeleton
            v-for="i in 7"
            :key="i"
            width="160px"
            height="90px"
            border-radius="12px"
            class="flex-shrink-0"
          />
        </template>

        <!-- Real day cards -->
        <template v-else>
          <div
            v-for="day in days"
            :key="day.iso"
            :data-day="day.iso"
            :class="[
              'flex-shrink-0 w-40 rounded-xl border-2 p-3 cursor-pointer transition-all',
              day.iso === selectedDay
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-200 bg-white hover:border-gray-300',
            ]"
            @click="selectedDay = day.iso"
          >
            <div class="text-xs font-semibold text-gray-500 uppercase">{{ day.label }}</div>
            <div class="text-lg font-bold text-gray-900">{{ day.dayNum }}</div>

            <!-- Public holiday badge (shown above shift or off indicator) -->
            <div v-if="day.holiday" class="mt-1.5 flex items-center gap-1">
              <span class="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5 leading-tight truncate max-w-full">
                🎉 {{ day.holiday }}
              </span>
            </div>

            <!-- Approved leave badge -->
            <div v-if="day.leave" class="mt-1.5 flex items-center gap-1">
              <span class="text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full px-1.5 py-0.5 leading-tight capitalize truncate max-w-full">
                🌴 {{ day.leave }}
              </span>
            </div>

            <!-- Shift time: hidden when on approved leave (leave takes priority) -->
            <div v-if="day.shift && !day.leave" class="mt-2">
              <div class="flex items-center gap-1">
                <div class="text-xs font-medium text-brand-700">
                  {{ day.shift.start_time }} – {{ day.shift.end_time }}
                </div>
                <!-- Split-shift badge: "+1 more" when 2 shifts on same day -->
                <span
                  v-if="day.splitCount > 1"
                  class="text-[10px] font-bold bg-brand-100 text-brand-700 rounded-full px-1.5 leading-4"
                >+{{ day.splitCount - 1 }}</span>
              </div>
            </div>
            <!-- Shift/leave conflict indicator: leave approved but shifts still assigned -->
            <div v-else-if="day.shift && day.leave" class="mt-1.5 flex items-center gap-1">
              <span class="text-[10px] font-semibold text-orange-700 bg-orange-100 border border-orange-300 rounded-full px-1.5 py-0.5 leading-tight">
                ⚠ conflict
              </span>
            </div>
            <div v-else-if="day.holiday" class="mt-1 text-xs text-amber-600 italic">Jour férié</div>
            <div v-else-if="!day.leave" class="mt-2 text-xs text-gray-300 italic">Off</div>
          </div>
        </template>
      </div>
    </div>

    <!-- ── Selected day detail ─────────────────────────────────────────────── -->

    <!-- Approved leave banner — shown whenever the day is on leave, regardless of shifts -->
    <div v-if="!schedStore.loading && selectedDayLeave" class="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
      <i class="pi pi-sun text-2xl block mb-1.5 text-emerald-500" />
      <div class="font-semibold text-emerald-700 capitalize">{{ selectedDayLeave }}</div>
      <div class="text-xs text-emerald-500 mt-0.5">Approved leave</div>
    </div>

    <!-- Shift conflict warning + cards: only shown when shifts exist AND leave is also active -->
    <template v-if="selectedDayAssignments.length && selectedDayLeave">
      <div class="mt-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 flex items-center gap-2 text-xs text-orange-800">
        <i class="pi pi-exclamation-triangle text-orange-500 flex-shrink-0" />
        You are still scheduled during this leave — contact your manager to resolve the conflict.
      </div>
      <div class="mt-2 space-y-3 opacity-60">
        <ShiftCard
          v-for="assn in selectedDayAssignments"
          :key="assn.id"
          :assignment="assn"
          :store-id="storeId"
        />
      </div>
    </template>

    <!-- Normal: shifts without leave -->
    <div v-else-if="selectedDayAssignments.length" class="mt-4 space-y-3">
      <ShiftCard
        v-for="assn in selectedDayAssignments"
        :key="assn.id"
        :assignment="assn"
        :store-id="storeId"
      />
    </div>

    <!-- No shifts and no leave: holiday or day off -->
    <div v-else-if="!schedStore.loading && selectedDay && !selectedDayLeave" class="mt-4 text-center py-6 text-sm">
      <template v-if="selectedDayHoliday">
        <i class="pi pi-star text-2xl block mb-2 text-amber-500" />
        <div class="font-semibold text-amber-700">{{ selectedDayHoliday }}</div>
        <div class="text-xs text-amber-500 mt-1">Jour férié</div>
      </template>
      <template v-else>
        <i class="pi pi-sun text-2xl block mb-2 text-gray-400" />
        <span class="text-gray-400">Day off</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSwipe } from '@vueuse/core'
import Skeleton from 'primevue/skeleton'
import { useStoreContext } from '@/stores/storeContext'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useLeaveStore } from '@/features/leave/stores/leaveStore'
import { useAuthStore } from '@/stores/auth'
import { usePublicHolidays } from '@/features/schedule/composables/usePublicHolidays'
import ShiftCard from './ShiftCard.vue'

const props = defineProps<{ storeId: string }>()

const ctx        = useStoreContext()
const schedStore = useScheduleStore()
const leaveStore = useLeaveStore()
const auth       = useAuthStore()
const stripRef   = ref<HTMLElement | null>(null)

const weekStartRef               = computed(() => ctx.weekStart)
const { holidays }               = usePublicHolidays(weekStartRef)
const holidayMap                 = computed(() => {
  const m = new Map<string, string>()
  for (const h of holidays.value) m.set(h.date, h.name)
  return m
})

/** Map ISO date → leave type for the current user's approved leaves that overlap the visible week. */
const myLeaveMap = computed(() => {
  const m = new Map<string, string>()
  const userId = auth.user?.id
  if (!userId) return m
  for (const leave of leaveStore.leaves) {
    if (leave.employee_id !== userId || leave.status !== 'approved') continue
    // Expand the date range into individual days
    const start = new Date(`${leave.start_date}T00:00:00`)
    const end   = new Date(`${leave.end_date}T00:00:00`)
    const d = new Date(start)
    while (d <= end) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      m.set(iso, leave.type)
      d.setDate(d.getDate() + 1)
    }
  }
  return m
})

// ── Sprint 3.1: auto-select today if it falls in the current week ──────────
function todayOrMonday(): string {
  const today = new Date().toISOString().split('T')[0]
  return ctx.weekStart <= today && today <= ctx.weekEnd ? today : ctx.weekStart
}

const selectedDay = ref<string>(todayOrMonday())

// Re-anchor when the user navigates to a different week
watch(() => ctx.weekStart, () => { selectedDay.value = todayOrMonday() })

// ── Sprint 3.2: scroll selected card into view after render ────────────────
function scrollToSelected() {
  nextTick(() => {
    stripRef.value
      ?.querySelector<HTMLElement>(`[data-day="${selectedDay.value}"]`)
      ?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  })
}

watch(selectedDay, scrollToSelected)
watch(() => schedStore.loading, (loading) => { if (!loading) scrollToSelected() })

// ── Swipe to navigate weeks ────────────────────────────────────────────────
useSwipe(stripRef, {
  onSwipeEnd: (_, dir) => {
    if (dir === 'left')  ctx.nextWeek()
    if (dir === 'right') ctx.prevWeek()
  },
})

// ── Timezone-safe ISO date ─────────────────────────────────────────────────
// toISOString() converts to UTC — in CEST (UTC+2) midnight local becomes
// 22:00 the *previous* day UTC, shifting every card by -1 day.
// Use local year/month/date parts instead to stay in the wall-clock date.
function localIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Day cards ──────────────────────────────────────────────────────────────
const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ctx.weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const iso      = localIso(d)
    // Collect ALL assignments for this employee+day (handles split shifts)
    const myAssns  = schedStore.assignments.filter(
      (a) => a.employee_id === auth.user?.id && a.shift_date === iso,
    )
    // First assignment's shift used for the strip card preview
    const firstAssn = myAssns[0] ?? null
    const shift      = firstAssn ? schedStore.shifts.find((s) => s.id === firstAssn.shift_id) : null
    return {
      iso,
      label:       d.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum:      d.getDate(),
      shift,
      assignment:  firstAssn,
      assignments: myAssns,        // all assignments for this day
      splitCount:  myAssns.length, // 0 = off, 1 = single, 2+ = split
      holiday:     holidayMap.value.get(iso) ?? null,
      leave:       myLeaveMap.value.get(iso) ?? null,
    }
  }),
)

// All assignments for the selected day (may be 0, 1, or several for split shifts)
const selectedDayAssignments = computed(() =>
  schedStore.assignments.filter(
    (a) => a.employee_id === auth.user?.id && a.shift_date === selectedDay.value,
  ),
)

// Holiday name for the currently selected day (null if none)
const selectedDayHoliday = computed(() => holidayMap.value.get(selectedDay.value) ?? null)
// Approved leave type for the currently selected day (null if none)
const selectedDayLeave   = computed(() => myLeaveMap.value.get(selectedDay.value) ?? null)
</script>

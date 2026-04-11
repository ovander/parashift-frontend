<template>
  <Card class="border border-gray-200">
    <template #header>
      <div class="flex items-center justify-between p-4 pb-0">
        <!-- Sprint 1.4: fixed type — uses canonical Assignment from @/types -->
        <span class="font-semibold text-gray-800 capitalize">{{ shift?.role ? shift.role.replace(/_/g, ' ') : '—' }}</span>
        <div class="flex items-center gap-2">
          <!-- Sprint 5.2: acknowledgement badge (green once confirmed) -->
          <Tag
            v-if="shift?.status === 'PUBLISHED'"
            :severity="isAcknowledged ? 'success' : 'warning'"
            :value="isAcknowledged ? t('schedule.confirmed') : t('schedule.pendingConfirmation')"
            class="text-xs"
          />
          <Tag v-else :value="shift?.date" severity="secondary" />
        </div>
      </div>
    </template>

    <template #content>
      <div class="space-y-3 text-sm">
        <!-- Time -->
        <div class="flex items-center gap-2 text-gray-600">
          <i class="pi pi-clock text-gray-400" />
          {{ shift?.start_time }} – {{ shift?.end_time }}
        </div>

        <!-- Sprint 5.1: shift notes -->
        <div v-if="(shift as any)?.notes" class="flex items-start gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <i class="pi pi-info-circle text-gray-400 mt-0.5 flex-shrink-0" />
          <span>{{ (shift as any).notes }}</span>
        </div>

        <!-- Sprint 5.3: colleagues with swap eligibility icon -->
        <div v-if="colleagues.length" class="flex items-start gap-2 text-gray-600">
          <i class="pi pi-users text-gray-400 mt-0.5 flex-shrink-0" />
          <div class="flex flex-wrap gap-2">
            <button
              v-for="col in colleagues"
              :key="col.id"
              class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-brand-100 hover:text-brand-700 transition-colors"
              :title="`Request swap with ${col.name}`"
              @click="openSwapWith(col.id)"
            >
              {{ col.name }}
              <i class="pi pi-arrows-h text-gray-400 text-xs" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 flex-wrap">
        <!-- Sprint 5.2: confirm shift button — shown for published, unacknowledged -->
        <Button
          v-if="shift?.status === 'PUBLISHED' && !isAcknowledged"
          :label="t('schedule.confirmShift')"
          icon="pi pi-check"
          size="small"
          severity="success"
          :loading="acknowledging"
          @click="acknowledge"
        />

        <!-- Sprint 5.3: generic swap button (no pre-filled colleague) -->
        <Button
          :label="t('swap.request')"
          icon="pi pi-arrows-h"
          size="small"
          outlined
          @click="openSwapWith(null)"
        />
      </div>
    </template>
  </Card>

  <!-- Sprint 5.3: SwapRequestDialog with optional pre-filled target -->
  <SwapRequestDialog
    v-model:visible="swapDialogOpen"
    :shift-id="assignment.shift_id"
    :store-id="storeId"
    :initial-target-id="swapTargetId"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useAuthStore } from '@/stores/auth'
import SwapRequestDialog from '@/features/swap/components/SwapRequestDialog.vue'
import type { Assignment } from '@/types'

// Sprint 1.4: prop type corrected from non-existent ShiftAssignment → Assignment
const props  = defineProps<{ assignment: Assignment; storeId: string }>()
const { t }  = useI18n()
const sched  = useScheduleStore()
const emps   = useEmployeeStore()
const auth   = useAuthStore()

const swapDialogOpen = ref(false)
const swapTargetId   = ref<string | null>(null)
const acknowledging  = ref(false)

const shift = computed(() => sched.shifts.find((s) => s.id === props.assignment.shift_id))

// Sprint 5.2: acknowledged if the server returned acknowledged_at, or we set it optimistically
const isAcknowledged = computed(() => !!props.assignment.acknowledged_at)

// Sprint 5.3: colleagues on the same shift, excluding current user
const colleagues = computed(() => {
  const others = sched.assignments.filter(
    (a) => a.shift_id === props.assignment.shift_id && a.employee_id !== auth.user?.id,
  )
  return others
    .map((a) => emps.employees.find((e) => e.id === a.employee_id))
    .filter(Boolean) as NonNullable<ReturnType<typeof emps.employees.find>>[]
})

// Sprint 5.3: open swap dialog pre-filled with a specific colleague (or empty)
function openSwapWith(employeeId: string | null) {
  swapTargetId.value   = employeeId
  swapDialogOpen.value = true
}

// Sprint 5.2: acknowledge the shift
async function acknowledge() {
  acknowledging.value = true
  try {
    await sched.acknowledgeAssignment(props.storeId, props.assignment.id)
  } finally {
    acknowledging.value = false
  }
}
</script>

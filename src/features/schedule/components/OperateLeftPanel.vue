<template>
  <aside class="w-64 flex-shrink-0 bg-white border-r flex flex-col h-full">
    <!-- Header -->
    <div class="p-3 border-b">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold text-gray-700">{{ t('schedule.operate.teamRoster') }}</span>
        <Badge :value="String(readyCount)" severity="success" />
      </div>
      <InputText
        v-model="search"
        size="small"
        :placeholder="t('schedule.operate.searchPlaceholder')"
        class="w-full text-xs"
        prefix-icon="pi pi-search"
      />
    </div>

    <!-- Employee list -->
    <div class="flex-1 overflow-y-auto divide-y">
      <div
        v-for="emp in filteredEmployees"
        :key="emp.id"
        draggable="true"
        class="px-3 py-2.5 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
        @dragstart="onDragStart($event, emp.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ emp.name }}</p>
            <p class="text-xs text-gray-500 capitalize">{{ emp.job_role }}</p>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0 ml-2">
            <Badge
              v-if="getShiftCount(emp.id) > 0"
              :value="String(getShiftCount(emp.id))"
              severity="info"
              class="text-xs"
            />
            <i
              :class="isAvailable(emp.id) ? 'pi pi-circle-fill text-green-500' : 'pi pi-circle text-gray-300'"
              class="text-xs"
            />
          </div>
        </div>
        <div v-if="hasQualAlert(emp.id)" class="mt-1">
          <span class="text-xs text-orange-600 flex items-center gap-0.5">
            <i class="pi pi-exclamation-circle text-xs" /> {{ t('schedule.operate.expiringQuals') }}
          </span>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Badge from 'primevue/badge'
import InputText from 'primevue/inputtext'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useQualificationStore } from '@/features/qualifications/stores/qualificationStore'

const { t } = useI18n()
const emit = defineEmits<{ 'drag-employee': [employeeId: string] }>()

const employeeStore = useEmployeeStore()
const scheduleStore = useScheduleStore()
const qualStore = useQualificationStore()

const search = ref('')

const filteredEmployees = computed(() => {
  const q = search.value.toLowerCase()
  return (employeeStore.employees ?? []).filter(
    (e) => !q || e.name.toLowerCase().includes(q) || e.job_role.toLowerCase().includes(q)
  )
})

const readyCount = computed(() =>
  filteredEmployees.value.filter((e) => isAvailable(e.id)).length
)

function getShiftCount(empId: string): number {
  return scheduleStore.assignments.filter((a) => a.employee_id === empId).length
}

function isAvailable(empId: string): boolean {
  // Simple heuristic: employee is available if they have fewer than 5 shifts this week
  return getShiftCount(empId) < 5
}

function hasQualAlert(empId: string): boolean {
  const quals = qualStore.getEmployeeQuals(empId)
  return quals.some((q) => {
    if (!q.expiry_date) return false
    const daysLeft = (new Date(q.expiry_date).getTime() - Date.now()) / (1000 * 86400)
    return daysLeft < 30
  })
}

function onDragStart(event: DragEvent, employeeId: string) {
  event.dataTransfer?.setData('application/parashift-employee', employeeId)
  emit('drag-employee', employeeId)
}
</script>

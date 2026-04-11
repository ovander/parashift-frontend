<template>
  <div class="space-y-4" data-testid="quick-assign-sheet">
    <!-- Shift summary -->
    <div class="bg-gray-50 rounded-xl p-3 text-sm">
      <p class="font-medium">{{ shift.start_time }} – {{ shift.end_time }}</p>
      <p class="text-gray-500 capitalize">{{ shift.role }} · {{ shift.date }}</p>
    </div>

    <!-- Search -->
    <div class="relative">
      <InputText
        v-model="search"
        :placeholder="t('schedule.operate.searchPlaceholder')"
        class="w-full"
        autofocus
      />
    </div>

    <!-- Employee list -->
    <div class="space-y-2 max-h-64 overflow-y-auto">
      <button
        v-for="emp in filteredEmployees"
        :key="emp.id"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border hover:border-brand-400 hover:bg-brand-50 transition-colors text-left"
        :disabled="assigning"
        @click="assign(emp.id)"
      >
        <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-medium text-brand-700 flex-shrink-0">
          {{ initials(emp.name) }}
        </div>
        <div class="min-w-0">
          <p class="font-medium text-gray-900 truncate">{{ emp.name }}</p>
          <p class="text-sm text-gray-500 capitalize">{{ emp.job_role }}</p>
        </div>
        <i v-if="assigning && assigningId === emp.id" class="pi pi-spin pi-spinner ml-auto text-brand-500" />
      </button>

      <!-- Sprint 2.2: role-aware empty states ────────────────────────────── -->
      <div
        v-if="filteredEmployees.length === 0 && !employeeStore.loading"
        class="text-center py-8 text-gray-400"
      >
        <i class="pi pi-users text-2xl block mb-2" />
        <!-- Distinguish "search found nothing" from "no one has this role" -->
        <p v-if="search" class="text-sm">{{ t('schedule.quickAssign.noMatchSearch', { search, role: shift.role }) }}</p>
        <p v-else class="text-sm">
          <i18n-t keypath="schedule.quickAssign.noMatchRole" tag="span">
            <template #role><strong>{{ shift.role }}</strong></template>
          </i18n-t>
          <br />
          <span class="text-xs text-gray-300">{{ t('schedule.quickAssign.checkSettings') }}</span>
        </p>
      </div>

      <!-- Loading state -->
      <div v-if="employeeStore.loading" class="space-y-2">
        <Skeleton v-for="i in 3" :key="i" height="58px" border-radius="12px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useStoreContext } from '@/stores/storeContext'
import { useToast } from 'primevue/usetoast'
import type { ShiftInstance } from '@/types'

const props = defineProps<{ shift: ShiftInstance }>()
const emit  = defineEmits<{ assigned: [] }>()

const { t }         = useI18n()
const employeeStore = useEmployeeStore()
const scheduleStore = useScheduleStore()
const ctx           = useStoreContext()
const toast         = useToast()

const search      = ref('')
const assigning   = ref(false)
const assigningId = ref<string | null>(null)

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

const filteredEmployees = computed(() => {
  const q = search.value.toLowerCase()
  return (employeeStore.employees ?? []).filter(
    (e) => e.job_role === props.shift.role && (!q || e.name.toLowerCase().includes(q)),
  )
})

async function assign(employeeId: string) {
  assigning.value   = true
  assigningId.value = employeeId
  try {
    await scheduleStore.assign(ctx.storeId, props.shift.id, employeeId)
    toast.add({ severity: 'success', summary: t('schedule.quickAssign.assigned'), detail: t('schedule.quickAssign.assignedDetail'), life: 2000 })
    emit('assigned')
  } catch {
    toast.add({ severity: 'error', summary: t('schedule.quickAssign.assignFailed'), life: 3000 })
  } finally {
    assigning.value   = false
    assigningId.value = null
  }
}
</script>

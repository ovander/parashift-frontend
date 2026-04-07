<template>
  <div class="p-6 space-y-4 overflow-y-auto h-full">
    <h1 class="text-xl font-semibold text-gray-900">Leave Approval</h1>
    <Card>
      <template #content>
        <DataTable :value="leaveStore.pendingLeave" :loading="leaveStore.loading">
          <Column header="Employee">
            <template #body="{ data }">{{ employeeName(data.employee_id) }}</template>
          </Column>
          <Column header="Type" style="width:110px">
            <template #body="{ data }">
              <span class="capitalize">{{ data.type }}</span>
            </template>
          </Column>
          <Column field="start_date" header="Start" style="width:120px" />
          <Column field="end_date"   header="End"   style="width:120px" />
          <Column field="reason"     header="Reason" />
          <Column header="Actions" style="width:130px">
            <template #body="{ data }">
              <div class="flex gap-1">
                <!-- Approve: opens impact dialog first -->
                <Button
                  size="small"
                  icon="pi pi-check"
                  severity="success"
                  outlined
                  v-tooltip.top="'Preview impact & approve'"
                  @click="openImpactDialog(data)"
                />
                <Button
                  size="small"
                  icon="pi pi-times"
                  severity="danger"
                  outlined
                  v-tooltip.top="'Reject'"
                  @click="leaveStore.rejectLeave(ctx.storeId, data.id)"
                />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="text-center py-8 text-gray-400">No pending leave requests.</div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Impact preview + approval confirmation dialog -->
    <LeaveImpactDialog
      v-model:visible="dialogVisible"
      :leave="selectedLeave"
      :employee-name="selectedLeave ? employeeName(selectedLeave.employee_id) : ''"
      :impact="impact"
      :loading="impactLoading"
      :error="impactError"
      :confirming="confirming"
      @confirm="confirmApprove"
      @cancel="closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import { useLeaveStore }    from '../stores/leaveStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useStoreContext }  from '@/stores/storeContext'
import LeaveImpactDialog    from '../components/LeaveImpactDialog.vue'
import type { LeaveRequest, LeaveImpact } from '@/types'

const leaveStore    = useLeaveStore()
const employeeStore = useEmployeeStore()
const ctx           = useStoreContext()

onMounted(() => {
  leaveStore.fetchLeave(ctx.storeId)
  employeeStore.fetchEmployees(ctx.storeId)
})

/** Resolve a UUID to a display name; falls back to the first 8 chars of the ID. */
function employeeName(id: string): string {
  const emp = employeeStore.employees.find((e) => e.id === id)
  return emp?.name ?? id.slice(0, 8) + '…'
}

// ── Impact dialog state ──────────────────────────────────────────────────────
const dialogVisible  = ref(false)
const selectedLeave  = ref<LeaveRequest | null>(null)
const impact         = ref<LeaveImpact | null>(null)
const impactLoading  = ref(false)
const impactError    = ref<string | null>(null)
const confirming     = ref(false)

async function openImpactDialog(leave: LeaveRequest) {
  selectedLeave.value = leave
  impact.value        = null
  impactError.value   = null
  impactLoading.value = true
  dialogVisible.value = true

  try {
    impact.value = await leaveStore.fetchLeaveImpact(ctx.storeId, leave.id)
  } catch (err: any) {
    impactError.value = err?.response?.data?.message ?? 'Failed to load impact preview.'
  } finally {
    impactLoading.value = false
  }
}

async function confirmApprove() {
  if (!selectedLeave.value) return
  confirming.value = true
  try {
    await leaveStore.approveLeave(ctx.storeId, selectedLeave.value.id)
    closeDialog()
  } finally {
    confirming.value = false
  }
}

function closeDialog() {
  dialogVisible.value = false
  selectedLeave.value = null
  impact.value        = null
  impactError.value   = null
}
</script>

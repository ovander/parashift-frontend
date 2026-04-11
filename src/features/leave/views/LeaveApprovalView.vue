<template>
  <div class="p-6 space-y-4 overflow-y-auto h-full">
    <h1 class="text-xl font-semibold text-gray-900">{{ t('leave.approval') }}</h1>
    <Card>
      <template #content>
        <DataTable :value="leaveStore.leaves" :loading="leaveStore.loading">
          <Column :header="t('leave.colEmployee')">
            <template #body="{ data }">{{ employeeName(data.employee_id) }}</template>
          </Column>
          <Column :header="t('leave.colType')" style="width:110px">
            <template #body="{ data }">
              <span>{{ t(`leave.type.${data.type}`, data.type) }}</span>
            </template>
          </Column>
          <!-- hidden on mobile -->
          <Column v-if="!isMobile" field="start_date" :header="t('leave.colStart')" style="width:120px" />
          <Column v-if="!isMobile" field="end_date"   :header="t('leave.colEnd')"   style="width:120px" />
          <!-- desktop only -->
          <Column v-if="isDesktop" field="reason" :header="t('leave.colReason')" />
          <!-- Status column -->
          <Column :header="t('leave.colStatus')" style="width:110px">
            <template #body="{ data }">
              <Tag
                :value="t(`leave.${data.status}`, data.status)"
                :severity="data.status === 'approved' ? 'success' : data.status === 'rejected' ? 'danger' : 'warn'"
                class="capitalize"
              />
            </template>
          </Column>
          <Column :header="t('leave.colActions')" style="width:100px">
            <template #body="{ data }">
              <div v-if="data.status === 'pending'" class="flex gap-1">
                <!-- Approve: opens impact dialog first -->
                <Button
                  size="small"
                  icon="pi pi-check"
                  severity="success"
                  outlined
                  v-tooltip.top="t('leave.tooltipApprove')"
                  @click="openImpactDialog(data)"
                />
                <Button
                  size="small"
                  icon="pi pi-times"
                  severity="danger"
                  outlined
                  v-tooltip.top="t('leave.tooltipReject')"
                  @click="leaveStore.rejectLeave(ctx.storeId, data.id)"
                />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="text-center py-8 text-gray-400">{{ t('leave.noRequests') }}</div>
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
import { useI18n } from 'vue-i18n'
import { useBreakpoint } from '@/composables/useBreakpoint'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import Tag       from 'primevue/tag'
import { useLeaveStore }    from '../stores/leaveStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useStoreContext }  from '@/stores/storeContext'
import LeaveImpactDialog    from '../components/LeaveImpactDialog.vue'
import type { LeaveRequest, LeaveImpact } from '@/types'

const { t } = useI18n()
const { isMobile, isDesktop } = useBreakpoint()

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
    impactError.value = err?.response?.data?.message ?? t('leave.impactLoadFailed')
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

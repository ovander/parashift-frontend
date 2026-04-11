<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">{{ t('leave.title') }}</h1>
      <Button :label="t('leave.request')" icon="pi pi-plus" @click="formOpen = true" />
    </div>

    <!-- Loading skeletons -->
    <div v-if="leaveStore.loading" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" height="72px" border-radius="12px" />
    </div>

    <!-- Empty state -->
    <div v-else-if="leaveStore.leaves.length === 0" class="text-center py-12 text-gray-400">
      <i class="pi pi-calendar text-3xl block mb-3" />
      <p>{{ t('leave.noRequests') }}</p>
    </div>

    <!-- Leave request cards -->
    <div v-else class="space-y-3">
      <div
        v-for="leave in leaveStore.leaves"
        :key="leave.id"
        class="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900">{{ t(`leave.type.${leave.type}`, leave.type) }}</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ leave.start_date }} – {{ leave.end_date }}</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <Tag :value="leave.status" :severity="statusSeverity(leave.status)" class="capitalize" />
          <Button
            v-if="leave.status === 'pending'"
            icon="pi pi-times"
            text rounded size="small" severity="danger"
            v-tooltip.top="t('leave.tooltipCancel')"
            @click="confirmCancel(leave.id)"
          />
        </div>
      </div>
    </div>

    <LeaveRequestForm v-model:visible="formOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import { useLeaveStore } from '../stores/leaveStore'
import { useStoreContext } from '@/stores/storeContext'
import LeaveRequestForm from '../components/LeaveRequestForm.vue'
import type { LeaveStatus } from '@/types'

const { t } = useI18n()
const leaveStore = useLeaveStore()
const ctx        = useStoreContext()
const formOpen   = ref(false)

function statusSeverity(s: LeaveStatus) {
  return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warn'
}

function confirmCancel(leaveId: string) {
  if (!window.confirm(t('leave.confirmCancel'))) return
  leaveStore.cancelLeave(ctx.storeId, leaveId)
}

onMounted(() => leaveStore.fetchLeave(ctx.storeId))
</script>

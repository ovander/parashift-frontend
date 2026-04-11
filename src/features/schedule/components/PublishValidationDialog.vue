<template>
  <ResponsiveDialog
    v-model:visible="visible"
    :header="t('schedule.publish.dialogTitle')"
    size="sm"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        {{ t('schedule.publish.description') }}
        <strong>{{ t('schedule.publish.weekOf') }} {{ ctx.weekStart }}</strong>.
      </p>

      <div v-if="warnings.length" class="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-1">
        <p class="text-xs font-semibold text-yellow-800 mb-1">{{ t('schedule.publish.warnings') }}</p>
        <p v-for="w in warnings" :key="w" class="text-xs text-yellow-700 flex items-start gap-1">
          <i class="pi pi-exclamation-circle mt-0.5" />
          {{ w }}
        </p>
      </div>

      <div class="bg-gray-50 rounded p-3 text-xs text-gray-600 space-y-1">
        <div class="flex justify-between">
          <span>{{ t('schedule.publish.totalShifts') }}</span>
          <span class="font-medium">{{ shiftCount }}</span>
        </div>
        <div class="flex justify-between">
          <span>{{ t('schedule.publish.assigned') }}</span>
          <span class="font-medium">{{ assignedCount }}</span>
        </div>
        <div class="flex justify-between">
          <span>{{ t('schedule.publish.unassigned') }}</span>
          <span :class="unassignedCount > 0 ? 'text-orange-600 font-semibold' : 'font-medium'">
            {{ unassignedCount }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="t('schedule.publish.publish')"
        icon="pi pi-send"
        :loading="planStore.publishing"
        @click="doPublish"
      />
    </template>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import Button from 'primevue/button'
import { usePlanStore } from '@/stores/planStore'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import { useStoreContext } from '@/stores/storeContext'
import { useToast } from 'primevue/usetoast'

const { t } = useI18n()
const visible = defineModel<boolean>('visible', { default: false })

const planStore = usePlanStore()
const scheduleStore = useScheduleStore()
const ctx = useStoreContext()
const toast = useToast()

const shiftCount = computed(() => scheduleStore.shifts.length)
const assignedCount = computed(() => scheduleStore.assignments.length)
const unassignedCount = computed(() => shiftCount.value - assignedCount.value)

const warnings = computed(() => {
  const w: string[] = []
  if (unassignedCount.value > 0)
    w.push(`${unassignedCount.value} ${t('schedule.publish.unassignedWarning')}`)
  return w
})

async function doPublish() {
  try {
    await planStore.publish(ctx.storeId)
    toast.add({ severity: 'success', summary: 'Published', detail: 'Schedule published to all employees', life: 3000 })
    visible.value = false
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Publish failed', detail: 'Could not publish schedule', life: 4000 })
  }
}
</script>

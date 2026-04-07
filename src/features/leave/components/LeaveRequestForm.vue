<template>
  <Dialog v-model:visible="visible" :header="t('leave.request')" modal :style="{ width: 'min(400px, calc(100vw - 2rem))' }">
    <div class="space-y-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Type</label>
        <Select
          v-model="form.type"
          :options="optionsStore.leaveTypes"
          option-label="label"
          option-value="value"
          :loading="optionsStore.loading"
          fluid
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Start date</label>
        <DatePicker v-model="form.start_date" date-format="yy-mm-dd" fluid show-icon />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">End date</label>
        <DatePicker v-model="form.end_date" date-format="yy-mm-dd" fluid show-icon :min-date="form.start_date" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Reason (optional)</label>
        <Textarea v-model="form.reason" rows="3" fluid />
      </div>
      <KSaveBanner :dirty="leaveStore.dirty" />
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" outlined @click="visible = false" />
      <Button :label="t('leave.request')" :loading="leaveStore.dirty.isSaving.value" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import { useLeaveStore } from '../stores/leaveStore'
import { useStoreContext } from '@/stores/storeContext'
import { useOptionsStore } from '@/stores/optionsStore'
import KSaveBanner from '@/components/KSaveBanner.vue'

const visible = defineModel<boolean>('visible', { default: false })
const { t }         = useI18n()
const leaveStore    = useLeaveStore()
const ctx           = useStoreContext()
const optionsStore  = useOptionsStore()

// Default to the first leave type returned by the backend (lazy-safe: falls back to '' while loading).
const defaultLeaveType = computed(() => optionsStore.leaveTypes[0]?.value ?? '')

const form = reactive({
  type:       defaultLeaveType.value,
  start_date: null as any,
  end_date:   null as any,
  reason:     '',
})

function toISO(d: Date | null): string { return d ? d.toISOString().split('T')[0] : '' }

async function submit() {
  if (!form.start_date || !form.end_date) return
  try {
    await leaveStore.createLeave(ctx.storeId, {
      type:       form.type,
      start_date: toISO(form.start_date),
      end_date:   toISO(form.end_date),
      reason:     form.reason || undefined,
    })
    visible.value = false
  } catch { /* KSaveBanner shows error */ }
}
</script>

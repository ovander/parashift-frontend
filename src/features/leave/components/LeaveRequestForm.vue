<template>
  <Dialog v-model:visible="visible" :header="t('leave.request')" modal :style="{ width: 'min(400px, calc(100vw - 2rem))' }">
    <div class="space-y-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">{{ t('leave.formType') }}</label>
        <Select
          v-model="form.type"
          :options="translatedLeaveTypes"
          option-label="label"
          option-value="value"
          :loading="optionsStore.loading"
          fluid
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">{{ t('leave.formStartDate') }}</label>
        <DatePicker v-model="form.start_date" date-format="yy-mm-dd" fluid show-icon />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">{{ t('leave.formEndDate') }}</label>
        <DatePicker v-model="form.end_date" date-format="yy-mm-dd" fluid show-icon :min-date="form.start_date" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">{{ t('leave.formReason') }}</label>
        <Textarea v-model="form.reason" rows="3" fluid />
      </div>
      <KSaveBanner :dirty="leaveStore.dirty as any" />
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" outlined @click="visible = false" />
      <Button :label="t('leave.request')" :loading="leaveStore.dirty.isSaving as any" @click="submit" />
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
import type { LeaveType } from '@/types'
import { fmtLocal } from '@/utils/dateUtils'

const visible = defineModel<boolean>('visible', { default: false })
const { t }         = useI18n()
const leaveStore    = useLeaveStore()
const ctx           = useStoreContext()
const optionsStore  = useOptionsStore()

// Translate backend leave type labels (value stays as backend key, label is locale-aware)
const translatedLeaveTypes = computed(() =>
  optionsStore.leaveTypes.map(lt => ({
    value: lt.value,
    label: t(`leave.type.${lt.value}`, lt.label as string),
  }))
)

// Default to the first leave type returned by the backend (lazy-safe: falls back to '' while loading).
const defaultLeaveType = computed(() => optionsStore.leaveTypes[0]?.value ?? '')

const form = reactive({
  type:       defaultLeaveType.value,
  start_date: null as any,
  end_date:   null as any,
  reason:     '',
})

function toISO(d: Date | null): string { return d ? fmtLocal(d) : '' }

async function submit() {
  if (!form.start_date || !form.end_date) return
  try {
    await leaveStore.createLeave(ctx.storeId, {
      type:       form.type as LeaveType,
      start_date: toISO(form.start_date),
      end_date:   toISO(form.end_date),
      reason:     form.reason || undefined,
    })
    visible.value = false
  } catch { /* KSaveBanner shows error */ }
}
</script>

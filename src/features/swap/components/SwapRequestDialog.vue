<template>
  <Dialog v-model:visible="visible" :header="t('swap.request')" modal :style="{ width: '380px' }">
    <div class="space-y-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Swap with</label>
        <Select
          v-model="targetEmployeeId"
          :options="eligibleEmployees"
          option-label="name"
          option-value="id"
          placeholder="Select an employee…"
          fluid
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Note (optional)</label>
        <Textarea v-model="note" rows="3" :placeholder="'Add a note to your request…'" fluid />
      </div>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" outlined @click="visible = false" />
      <Button
        :label="t('swap.request')"
        :disabled="!targetEmployeeId"
        :loading="submitting"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { useSwapStore } from '../stores/swapStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { useAuthStore } from '@/stores/auth'

const props   = defineProps<{
  shiftId:          string
  storeId:          string
  /** Pre-select a specific colleague in the swap dialog (Sprint 5.3). */
  initialTargetId?: string | null
}>()
const visible = defineModel<boolean>('visible', { default: false })
const { t }   = useI18n()
const swapStore = useSwapStore()
const empStore  = useEmployeeStore()
const auth      = useAuthStore()

const targetEmployeeId = ref<string | null>(props.initialTargetId ?? null)
const note             = ref('')
const submitting       = ref(false)

// Re-sync whenever parent changes the pre-fill (e.g. clicking a different colleague)
watch(() => props.initialTargetId, (v) => { targetEmployeeId.value = v ?? null })

const eligibleEmployees = computed(() =>
  empStore.employees.filter((e) => e.id !== auth.user?.id && e.is_active),
)

async function submit() {
  if (!targetEmployeeId.value) return
  submitting.value = true
  try {
    await swapStore.createSwap(props.storeId, {
      shift_instance_id:  props.shiftId,
      target_employee_id: targetEmployeeId.value,
      note:               note.value || undefined,
    })
    visible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

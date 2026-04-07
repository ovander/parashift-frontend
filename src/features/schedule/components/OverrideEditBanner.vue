<template>
  <div
    v-if="planStore.isPublished || planStore.isLive"
    class="flex items-center gap-3 px-4 py-2 bg-orange-50 border-b border-orange-200 text-sm"
  >
    <i class="pi pi-exclamation-triangle text-orange-500" />
    <span class="text-orange-800 font-medium">Post-publish edit mode</span>
    <span class="text-orange-600 text-xs">Changes will be logged as overrides. Employees will be notified.</span>
    <div class="ml-auto flex items-center gap-2">
      <span class="text-xs text-orange-600">Reason for edit:</span>
      <InputText
        v-model="reason"
        size="small"
        placeholder="e.g. Staff called in sick"
        class="text-xs w-48"
      />
      <Button
        size="small"
        severity="warning"
        label="Log Override"
        icon="pi pi-save"
        :disabled="!reason || !pendingShiftIds.length"
        @click="logOverride"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { usePlanStore } from '@/stores/planStore'
import { useStoreContext } from '@/stores/storeContext'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{ pendingShiftIds: string[] }>()
const emit = defineEmits<{ cleared: [] }>()

const planStore = usePlanStore()
const ctx = useStoreContext()
const toast = useToast()
const reason = ref('')

async function logOverride() {
  try {
    await planStore.recordOverride(ctx.storeId, {
      reason: reason.value,
      shift_ids: props.pendingShiftIds,
    })
    toast.add({ severity: 'info', summary: 'Override logged', life: 3000 })
    reason.value = ''
    emit('cleared')
  } catch {
    toast.add({ severity: 'error', summary: 'Override failed', life: 4000 })
  }
}
</script>

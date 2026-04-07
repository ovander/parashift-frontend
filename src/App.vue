<template>
  <RouterView />
  <Toast />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useUiStore } from '@/stores/ui'
import { watch } from 'vue'

const uiStore  = useUiStore()
const toast    = useToast()

// Bridge uiStore.showToast() → PrimeVue Toast service
watch(
  () => uiStore.toastMessages.length,
  () => {
    const msg = uiStore.toastMessages[uiStore.toastMessages.length - 1]
    if (msg) toast.add({ severity: msg.severity as any, summary: msg.summary, detail: msg.detail, life: msg.life })
  },
)
</script>

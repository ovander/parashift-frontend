<template>
  <Transition name="save-banner">
    <div v-if="visible" :class="bannerClass" class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm">
      <i :class="iconClass" />
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DirtyStateHandle } from '@/composables/useDirtyState'

const props = defineProps<{ dirty: DirtyStateHandle; loading?: boolean }>()

const showClean = ref(false)
let cleanTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.dirty.state.value,
  (state) => {
    if (state === 'clean') {
      showClean.value = true
      cleanTimer = setTimeout(() => { showClean.value = false }, 3_000)
    } else {
      if (cleanTimer) clearTimeout(cleanTimer)
      showClean.value = false
    }
  },
)

const visible = computed(() =>
  !props.loading &&
  (props.dirty.state.value !== 'clean' || showClean.value),
)

const bannerClass = computed(() => {
  switch (props.dirty.state.value) {
    case 'dirty':   return 'bg-amber-50 text-amber-800 border border-amber-200'
    case 'saving':  return 'bg-blue-50 text-blue-800 border border-blue-200'
    case 'error':   return 'bg-red-50 text-red-800 border border-red-200'
    default:        return 'bg-green-50 text-green-800 border border-green-200'
  }
})

const iconClass = computed(() => {
  switch (props.dirty.state.value) {
    case 'dirty':   return 'pi pi-pencil'
    case 'saving':  return 'pi pi-spin pi-spinner'
    case 'error':   return 'pi pi-exclamation-triangle'
    default:        return 'pi pi-check-circle'
  }
})

const message = computed(() => {
  switch (props.dirty.state.value) {
    case 'dirty':   return 'Unsaved changes'
    case 'saving':  return 'Saving…'
    case 'error':   return props.dirty.errorMessage.value || 'Not saved — please retry.'
    default:        return 'Saved'
  }
})
</script>

<style scoped>
.save-banner-enter-active,
.save-banner-leave-active { transition: opacity 0.2s, transform 0.2s; }
.save-banner-enter-from,
.save-banner-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>

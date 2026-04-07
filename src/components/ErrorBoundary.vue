<template>
  <div v-if="error" class="flex flex-col items-center justify-center min-h-64 p-8 text-center">
    <i class="pi pi-exclamation-circle text-4xl text-red-400 mb-4" />
    <h2 class="text-lg font-semibold text-gray-800 mb-2">Something went wrong</h2>
    <p class="text-sm text-gray-500 mb-4">{{ errorMessage }}</p>
    <button
      class="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
      @click="reset"
    >
      Try again
    </button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error        = ref<Error | null>(null)
const errorMessage = ref('')

onErrorCaptured((err: Error) => {
  error.value        = err
  errorMessage.value = err.message || 'An unexpected error occurred.'
  return false
})

function reset() { error.value = null; errorMessage.value = '' }
</script>

<template>
  <div v-if="swapStore.pendingIncoming.length > 0" class="mb-4 space-y-2">
    <h3 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
      <i class="pi pi-inbox text-amber-500" />
      {{ t('swap.incoming') }}
      <span class="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
        {{ swapStore.pendingIncoming.length }}
      </span>
    </h3>
    <div
      v-for="swap in swapStore.pendingIncoming"
      :key="swap.id"
      class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm"
    >
      <p class="text-gray-700 mb-2">
        <strong>{{ swap.requester?.name }}</strong> wants to swap their shift
        <span v-if="swap.note" class="italic text-gray-500"> — "{{ swap.note }}"</span>
      </p>
      <div class="flex gap-2">
        <Button size="small" :label="t('swap.accept')" icon="pi pi-check" severity="success" :loading="responding === swap.id + 'accept'" @click="respond(swap.id, 'accept')" />
        <Button size="small" :label="t('swap.decline')" icon="pi pi-times" severity="danger" outlined :loading="responding === swap.id + 'decline'" @click="respond(swap.id, 'decline')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useSwapStore } from '../stores/swapStore'
import { useStoreContext } from '@/stores/storeContext'

const { t }     = useI18n()
const swapStore = useSwapStore()
const ctx       = useStoreContext()
const responding = ref<string | null>(null)

async function respond(swapId: string, action: 'accept' | 'decline') {
  responding.value = swapId + action
  try { await swapStore.respondToSwap(ctx.storeId, swapId, action) }
  finally { responding.value = null }
}
</script>

<template>
  <Drawer v-model:visible="visible" position="right" :style="{ width: '380px' }">
    <template #header>
      <span class="font-semibold flex items-center gap-2">
        <i class="pi pi-history text-brand-500" /> Version History
      </span>
    </template>

    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton v-for="i in 3" :key="i" height="60px" />
    </div>

    <div v-else class="divide-y">
      <div
        v-for="(snap, i) in snapshots"
        :key="i"
        class="p-4 hover:bg-gray-50 cursor-pointer"
        @click="selectedIdx = i"
        :class="selectedIdx === i ? 'bg-brand-50 border-l-2 border-brand-500' : ''"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium">Snapshot {{ snapshots.length - i }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ formatDate(snap.taken_at) }}</p>
          </div>
          <div class="text-right text-xs text-gray-600">
            <div>{{ snap.shift_count }} shifts</div>
            <div>{{ Math.round(snap.coverage_rate * 100) }}% covered</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="overrides.length" class="border-t mt-4 p-4">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Override Log</p>
      <div class="space-y-2">
        <div v-for="ov in overrides" :key="ov.timestamp" class="text-xs bg-orange-50 rounded p-2">
          <p class="font-medium text-orange-800">{{ ov.reason }}</p>
          <p class="text-orange-600 mt-0.5">{{ formatDate(ov.timestamp) }} · {{ ov.shift_ids.length }} shifts</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between w-full">
        <Button
          label="Close"
          severity="secondary"
          text
          @click="visible = false"
        />
        <Button
          v-if="planStore.canRollback && selectedIdx > 0"
          label="Rollback to this"
          severity="warning"
          icon="pi pi-undo"
          @click="doRollback"
        />
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { usePlanStore } from '@/stores/planStore'
import { useStoreContext } from '@/stores/storeContext'
import { useToast } from 'primevue/usetoast'
import type { PlanSnapshot, PlanOverride } from '@/types'

const visible = defineModel<boolean>('visible', { default: false })

const planStore = usePlanStore()
const ctx = useStoreContext()
const toast = useToast()

const loading = ref(false)
const selectedIdx = ref(0)
const history = ref<any[]>([])

const snapshots = computed<PlanSnapshot[]>(() => planStore.plan?.snapshots ?? [])
const overrides = computed<PlanOverride[]>(() => planStore.plan?.override_log ?? [])

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

async function doRollback() {
  try {
    await planStore.rollback(ctx.storeId)
    toast.add({ severity: 'success', summary: 'Rolled back', detail: 'Schedule restored to previous snapshot', life: 3000 })
    visible.value = false
  } catch {
    toast.add({ severity: 'error', summary: 'Rollback failed', life: 4000 })
  }
}
</script>

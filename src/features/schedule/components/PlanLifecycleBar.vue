<template>
  <div
    class="flex items-center justify-between px-4 py-2 border-t bg-white text-sm"
    :class="stateClass"
  >
    <div class="flex items-center gap-3">
      <Tag :severity="tagSeverity" :value="plan?.state ?? 'DRAFT'" />
      <span class="text-gray-500 text-xs">
        Week of {{ weekStart }}
      </span>
      <span v-if="plan?.override_log?.length" class="text-orange-600 text-xs flex items-center gap-1">
        <i class="pi pi-pencil text-xs" />
        {{ plan.override_log.length }} override{{ plan.override_log.length > 1 ? 's' : '' }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <Button
        v-if="canRollback"
        size="small"
        severity="secondary"
        text
        icon="pi pi-history"
        label="History"
        @click="$emit('open-history')"
      />
      <Button
        v-if="canPublish"
        size="small"
        icon="pi pi-send"
        label="Publish Week"
        :loading="publishing"
        @click="$emit('publish')"
      />
      <Tag
        v-else-if="isLive"
        severity="success"
        value="LIVE"
        icon="pi pi-circle-fill"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { usePlanStore } from '@/stores/planStore'
import { useStoreContext } from '@/stores/storeContext'

defineEmits<{
  publish: []
  'open-history': []
}>()

const planStore = usePlanStore()
const ctx = useStoreContext()

const plan = computed(() => planStore.plan)
const canPublish = computed(() => planStore.canPublish)
const canRollback = computed(() => planStore.canRollback)
const isLive = computed(() => planStore.isLive)
const publishing = computed(() => planStore.publishing)
const weekStart = computed(() => ctx.weekStart)

const tagSeverity = computed(() => {
  switch (plan.value?.state) {
    case 'PUBLISHED': return 'info'
    case 'LIVE':      return 'success'
    case 'ARCHIVED':  return 'secondary'
    default:          return 'warning'
  }
})

const stateClass = computed(() => {
  switch (plan.value?.state) {
    case 'PUBLISHED': return 'border-blue-200 bg-blue-50'
    case 'LIVE':      return 'border-green-200 bg-green-50'
    default:          return ''
  }
})
</script>

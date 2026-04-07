<template>
  <div class="space-y-3">
    <!-- MAX_HOURS -->
    <template v-if="type === 'MAX_HOURS'">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Max weekly hours</label>
        <InputNumber v-model="config.max_weekly_hours" :min="1" :max="80" suffix=" h" fluid />
      </div>
    </template>

    <!-- MIN_REST -->
    <template v-else-if="type === 'MIN_REST'">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Minimum rest between shifts (hours)</label>
        <InputNumber v-model="config.min_rest_hours" :min="1" :max="24" suffix=" h" fluid />
      </div>
    </template>

    <!-- COVERAGE -->
    <template v-else-if="type === 'COVERAGE'">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Minimum employees per shift</label>
        <InputNumber v-model="config.min_employees" :min="1" :max="20" fluid />
      </div>
    </template>

    <!-- ROLE -->
    <template v-else-if="type === 'ROLE'">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Required qualification</label>
        <InputText v-model="config.required_qualification" placeholder="e.g. NURSE_LEVEL_2" fluid />
      </div>
    </template>

    <!-- NO_OVERLAP — no extra config needed -->
    <template v-else-if="type === 'NO_OVERLAP'">
      <p class="text-sm text-gray-500 italic">Prevents assigning the same employee to overlapping shifts. No additional configuration required.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import type { RuleType } from '@/types'

defineProps<{ type: RuleType }>()
const config = defineModel<Record<string, any>>('config', { default: () => ({}) })
</script>

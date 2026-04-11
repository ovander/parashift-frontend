<template>
  <div class="p-6 space-y-4">
    <h1 class="text-xl font-semibold text-gray-900">{{ t('swap.approval') }}</h1>
    <Card>
      <template #content>
        <DataTable :value="swapStore.swaps" :loading="swapStore.loading">
          <Column :header="t('swap.colRequester')">
            <template #body="{ data }">{{ data.requester?.name ?? data.requester_id }}</template>
          </Column>
          <Column :header="t('swap.colTarget')">
            <template #body="{ data }">{{ data.target_employee?.name ?? data.target_employee_id }}</template>
          </Column>
          <!-- desktop only -->
          <Column v-if="isDesktop" field="note" :header="t('swap.colNote')" />
          <Column :header="t('swap.colStatus')" style="width:100px">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="data.status === 'accepted' ? 'success' : data.status === 'rejected' ? 'danger' : 'warn'" />
            </template>
          </Column>
          <template #empty><div class="text-center py-8 text-gray-400">{{ t('swap.noSwaps') }}</div></template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBreakpoint } from '@/composables/useBreakpoint'

const { t } = useI18n()
const { isDesktop } = useBreakpoint()
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useSwapStore } from '../stores/swapStore'
import { useStoreContext } from '@/stores/storeContext'

const swapStore = useSwapStore()
const ctx       = useStoreContext()
onMounted(() => swapStore.fetchSwaps(ctx.storeId))
</script>

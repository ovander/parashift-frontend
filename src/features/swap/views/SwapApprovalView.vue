<template>
  <div class="p-6 space-y-4">
    <h1 class="text-xl font-semibold text-gray-900">Swap Requests</h1>
    <Card>
      <template #content>
        <DataTable :value="swapStore.swaps" :loading="swapStore.loading">
          <Column header="Requester">
            <template #body="{ data }">{{ data.requester?.name ?? data.requester_id }}</template>
          </Column>
          <Column header="Target">
            <template #body="{ data }">{{ data.target_employee?.name ?? data.target_employee_id }}</template>
          </Column>
          <Column field="note" header="Note" />
          <Column header="Status" style="width:100px">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="data.status === 'accepted' ? 'success' : data.status === 'rejected' ? 'danger' : 'warn'" />
            </template>
          </Column>
          <template #empty><div class="text-center py-8 text-gray-400">No swap requests.</div></template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
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

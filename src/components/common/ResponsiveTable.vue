<template>
  <!--
    ResponsiveTable — thin wrapper around PrimeVue DataTable that auto-hides
    columns based on the current breakpoint.

    Column definition shape:
      {
        field?:    string           // passed to <Column field>
        header:    string
        style?:    string
        sortable?: boolean
        hide?:     'mobile' | 'tablet'  // 'mobile' = hide on xs/sm, 'tablet' = hide on xs/sm/md
        // If neither field nor #body slot is needed, use the slot [header] pattern below
      }

    Named slots: provide a slot named after the column header (lowercased,
    spaces→dashes) to render a custom body cell, e.g. #status, #actions.
    The slot receives { data }.
  -->
  <DataTable v-bind="$attrs" :value="value" :loading="loading">
    <template v-for="col in visibleColumns" :key="col.header">
      <Column
        :field="col.field"
        :header="col.header"
        :style="col.style"
        :sortable="col.sortable"
      >
        <template v-if="hasSlot(col)" #body="{ data }">
          <slot :name="slotName(col.header)" :data="data" />
        </template>
      </Column>
    </template>

    <!-- Forward named slots that aren't column-body slots -->
    <template v-if="$slots.empty" #empty>
      <slot name="empty" />
    </template>
    <template v-if="$slots.expansion" #expansion="slotProps">
      <slot name="expansion" v-bind="slotProps" />
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import { useUiStore } from '@/stores/ui'

export interface TableColumn {
  field?:    string
  header:    string
  style?:    string
  sortable?: boolean
  /** 'mobile' hides on xs/sm (<768px). 'tablet' hides on xs/sm/md (<1024px). */
  hide?:     'mobile' | 'tablet'
}

const props = defineProps<{
  columns: TableColumn[]
  value:   unknown[]
  loading?: boolean
}>()

const ui = useUiStore()

const visibleColumns = computed<TableColumn[]>(() =>
  props.columns.filter((c) => {
    if (c.hide === 'mobile' && ui.isMobile)   return false
    if (c.hide === 'tablet' && !ui.isDesktop) return false
    return true
  }),
)

/** Convert a header label to a slot name: "Job Role" → "job-role" */
function slotName(header: string): string {
  return header.toLowerCase().replace(/\s+/g, '-')
}

/** Check whether the parent provided a custom body slot for this column. */
const slots = defineSlots<Record<string, (props: { data: unknown }) => unknown>>()
function hasSlot(col: TableColumn): boolean {
  return slotName(col.header) in slots
}
</script>

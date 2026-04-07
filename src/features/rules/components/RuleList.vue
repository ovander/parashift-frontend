<template>
  <DataTable :value="rulesStore.rules" :loading="rulesStore.loading" striped-rows>
    <Column :header="t('rules.type')" style="width: 160px">
      <template #body="{ data }">
        <span class="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
          {{ ruleTypeLabel(data.rule_type) }}
        </span>
      </template>
    </Column>
    <Column field="description" :header="t('rules.description')" />
    <Column :header="t('rules.severity')" style="width: 120px">
      <template #body="{ data }">
        <SeverityBadge :severity="data.severity" />
      </template>
    </Column>
    <Column :header="t('rules.enabled')" style="width: 90px">
      <template #body="{ data }">
        <ToggleSwitch
          :model-value="data.is_enabled"
          @update:model-value="rulesStore.toggleEnabled(ctx.storeId, data.id)"
        />
      </template>
    </Column>
    <Column :header="t('common.actions')" style="width: 100px">
      <template #body="{ data }">
        <div class="flex gap-1">
          <Button icon="pi pi-pencil" text rounded size="small" @click="emit('edit', data)" />
          <Button
            icon="pi pi-trash"
            text
            rounded
            size="small"
            severity="danger"
            @click="confirmDelete(data)"
          />
        </div>
      </template>
    </Column>
    <template #empty>
      <div class="text-center py-8 text-gray-400">
        <i class="pi pi-inbox text-3xl mb-2 block" />
        No rules configured. Create your first rule to enforce scheduling policies.
      </div>
    </template>
  </DataTable>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import ConfirmDialog from 'primevue/confirmdialog'
import { useRulesStore } from '../stores/rulesStore'
import { useStoreContext } from '@/stores/storeContext'
import SeverityBadge from '@/components/SeverityBadge.vue'
import type { Rule } from '@/types'

const { t }       = useI18n()
const rulesStore  = useRulesStore()
const ctx         = useStoreContext()
const confirm     = useConfirm()

const emit = defineEmits<{ (e: 'edit', rule: Rule): void }>()

const RULE_TYPE_LABELS: Record<string, string> = {
  MAX_HOURS:  'Max Hours',
  MIN_REST:   'Min Rest',
  NO_OVERLAP: 'No Overlap',
  COVERAGE:   'Coverage',
  ROLE:       'Role',
}

function ruleTypeLabel(type: string): string {
  return RULE_TYPE_LABELS[type] ?? type
}

function confirmDelete(rule: Rule) {
  confirm.require({
    message: `Delete rule "${rule.description}"? This cannot be undone.`,
    header: 'Delete Rule',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => rulesStore.deleteRule(ctx.storeId, rule.id),
  })
}
</script>

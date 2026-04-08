<template>
  <Drawer v-model:visible="visible" position="right" :style="{ width: '420px' }">
    <template #header>
      <span class="font-semibold">{{ isEdit ? 'Edit Rule' : t('rules.new') }}</span>
    </template>

    <form class="flex flex-col gap-4 p-2" @submit.prevent="submit">
      <!-- Type -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">{{ t('rules.type') }}</label>
        <Select
          v-model="form.type"
          :options="optionsStore.ruleTypes"
          option-label="label"
          option-value="value"
          :disabled="isEdit"
          :loading="optionsStore.loading"
          fluid
        />
        <small v-if="errors.type" class="text-red-500">{{ errors.type }}</small>
      </div>

      <!-- Severity -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">{{ t('rules.severity') }}</label>
        <Select
          v-model="form.severity"
          :options="optionsStore.ruleSeverities"
          option-label="label"
          option-value="value"
          :loading="optionsStore.loading"
          fluid
        />
        <small v-if="errors.severity" class="text-red-500">{{ errors.severity }}</small>
      </div>

      <!-- Description -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">{{ t('rules.description') }}</label>
        <InputText v-model="form.description" :placeholder="'Describe this rule…'" fluid />
        <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
      </div>

      <!-- Dynamic config -->
      <RuleConfigFields v-if="form.type" :type="form.type" v-model:config="form.config" />

      <!-- Enabled -->
      <div class="flex items-center gap-3">
        <ToggleSwitch v-model="form.is_enabled" />
        <label class="text-sm text-gray-700">{{ t('rules.enabled') }}</label>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-2">
        <Button
          type="submit"
          :label="t('common.save')"
          :loading="rulesStore.dirty.isSaving as any"
          class="flex-1"
        />
        <Button
          type="button"
          :label="t('common.cancel')"
          outlined
          @click="visible = false"
        />
      </div>

      <KSaveBanner :dirty="rulesStore.dirty as any" />
    </form>
  </Drawer>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import { useRulesStore } from '../stores/rulesStore'
import { useStoreContext } from '@/stores/storeContext'
import { useOptionsStore } from '@/stores/optionsStore'
import RuleConfigFields from './RuleConfigFields.vue'
import KSaveBanner from '@/components/KSaveBanner.vue'
import type { Rule, RuleSeverity } from '@/types'

const props = defineProps<{
  visible: boolean
  rule:    Rule | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved':          []
}>()

// Two-way binding for the Drawer's visible prop
const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const isEdit = computed(() => !!props.rule)

const { t } = useI18n()
const rulesStore   = useRulesStore()
const ctx          = useStoreContext()
const optionsStore = useOptionsStore()

const errors = reactive<Record<string, string>>({})

const form = reactive({
  type:        '' as string,
  severity:    'WARNING' as RuleSeverity,
  description: '',
  config:      {} as Record<string, any>,
  is_enabled:  true,
})

watch(() => props.rule, (rule) => {
  if (rule) {
    form.type        = rule.rule_type as string
    form.severity    = rule.severity as RuleSeverity
    form.description = rule.description ?? ''
    form.config      = { ...(rule.configuration as Record<string, any>) }
    form.is_enabled  = rule.is_enabled
  } else {
    form.type        = ''
    form.severity    = 'WARNING'
    form.description = ''
    form.config      = {}
    form.is_enabled  = true
  }
}, { immediate: true })

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.type)        errors.type = 'Type is required'
  if (!form.severity)    errors.severity = 'Severity is required'
  if (!form.description) errors.description = 'Description is required'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  try {
    if (isEdit.value && props.rule) {
      await rulesStore.updateRule(ctx.storeId, props.rule.id, {
        configuration: form.config,
        severity:      form.severity,
        description:   form.description,
        is_enabled:    form.is_enabled,
      })
    } else {
      await rulesStore.createRule(ctx.storeId, {
        rule_type:     form.type,
        configuration: form.config,
        severity:      form.severity,
        description:   form.description,
        is_enabled:    form.is_enabled,
      } as any)
    }
    visible.value = false
    emit('saved')
  } catch { /* error shown via KSaveBanner */ }
}
</script>

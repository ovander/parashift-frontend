<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-gray-900">{{ t('rules.title') }}</h1>
      <Button :label="t('rules.new')" icon="pi pi-plus" @click="openNew" />
    </div>

    <Card>
      <template #content>
        <RuleList @edit="openEdit" />
      </template>
    </Card>

    <RuleFormDrawer v-model:visible="drawerOpen" :rule="editingRule" @saved="drawerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useRulesStore } from '../stores/rulesStore'
import { useStoreContext } from '@/stores/storeContext'
import RuleList       from '../components/RuleList.vue'
import RuleFormDrawer from '../components/RuleFormDrawer.vue'
import type { Rule } from '@/types'

const { t }       = useI18n()
const rulesStore  = useRulesStore()
const ctx         = useStoreContext()

const drawerOpen  = ref(false)
const editingRule = ref<Rule | null>(null)

function openNew()         { editingRule.value = null; drawerOpen.value = true }
function openEdit(r: Rule) { editingRule.value = r;    drawerOpen.value = true }

onMounted(() => rulesStore.fetchRules(ctx.storeId))
</script>

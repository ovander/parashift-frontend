<template>
  <Tabs value="suggest">
    <TabList>
      <Tab value="suggest"><i class="pi pi-sparkles mr-1" />{{ t('ai.suggest') }}</Tab>
      <Tab value="insights"><i class="pi pi-lightbulb mr-1" />{{ t('ai.insights') }}</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="suggest">
        <ShiftSuggestPanel class="mt-3" />
      </TabPanel>
      <TabPanel value="insights">
        <InsightsPanel :store-id="storeId" class="mt-3" />
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Tabs from 'primevue/tabs'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ShiftSuggestPanel from './ShiftSuggestPanel.vue'
import InsightsPanel from './InsightsPanel.vue'

defineProps<{ storeId: string }>()
const { t } = useI18n()
</script>

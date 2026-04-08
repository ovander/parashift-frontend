<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">{{ t('nav.templates') }}</h1>
      <KSaveBanner :dirty="templateStore.dirty as any" />
    </div>

    <!-- A/B side by side -->
    <div class="grid grid-cols-2 gap-6">
      <div v-for="scheme in (['A', 'B'] as const)" :key="scheme" class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <Tag :value="`Schedule ${scheme}`" :severity="scheme === 'A' ? 'info' : 'warn'" />
          </h2>
          <Button
            :label="`Publish ${scheme}`"
            size="small"
            icon="pi pi-send"
            :loading="templateStore.publishing"
            @click="confirmPublish(scheme)"
          />
        </div>

        <!-- Template slots list -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div v-if="getSlots(scheme).length === 0" class="text-center py-8 text-sm text-gray-400">
            No shifts defined for Schedule {{ scheme }}.
            <button class="text-brand-600 underline ml-1" @click="openAddSlot(scheme)">Add first shift</button>
          </div>
          <div v-else>
            <div
              v-for="slot in getSlots(scheme)"
              :key="slot.id"
              class="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 text-sm"
            >
              <div>
                <span class="font-medium">{{ dayName(slot.day_of_week) }}</span>
                <span class="text-gray-500 ml-2">{{ slot.start_time }} – {{ slot.end_time }}</span>
                <Tag :value="slot.required_role" class="ml-2" severity="secondary" />
              </div>
              <Button icon="pi pi-trash" text rounded size="small" severity="danger"
                @click="templateStore.deleteTemplate(storeId, slot.id)" />
            </div>
          </div>
        </div>

        <Button :label="`Add shift to ${scheme}`" icon="pi pi-plus" size="small" outlined fluid
          @click="openAddSlot(scheme)" />
      </div>
    </div>

    <!-- Add slot dialog -->
    <Dialog v-model:visible="addSlotOpen" header="Add Shift Slot" modal :style="{ width: '360px' }">
      <div class="space-y-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Day of week</label>
          <Select v-model="newSlot.day_of_week" :options="dayOptions" option-label="label" option-value="value" :loading="optionsStore.loading" fluid />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-gray-700">Start</label>
            <InputText v-model="newSlot.start_time" placeholder="08:00" fluid />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-gray-700">End</label>
            <InputText v-model="newSlot.end_time" placeholder="16:00" fluid />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Required role</label>
          <InputText v-model="newSlot.required_role" placeholder="e.g. NURSE" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" outlined @click="addSlotOpen = false" />
        <Button label="Add" :loading="templateStore.dirty.isSaving as any" @click="addSlot" />
      </template>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import ConfirmDialog from 'primevue/confirmdialog'
import { useTemplateStore } from '../stores/templateStore'
import { useStoreContext } from '@/stores/storeContext'
import { useOptionsStore } from '@/stores/optionsStore'
import KSaveBanner from '@/components/KSaveBanner.vue'

const { t }           = useI18n()
const templateStore   = useTemplateStore()
const ctx             = useStoreContext()
const confirm         = useConfirm()
const optionsStore    = useOptionsStore()
const storeId         = ctx.storeId
const addSlotOpen     = ref(false)
const addingToScheme  = ref<'A' | 'B'>('A')

// dayOptions and dayName come from the options store (backend is the single source of truth).
// Sunday value = 0 (Go/JS convention) — the old inline list incorrectly used 7.
const dayOptions = computed(() => optionsStore.daysOfWeek)
const dayName = (n: number) => optionsStore.daysOfWeek.find((d) => d.value === n)?.label ?? `Day ${n}`

const newSlot = reactive({ day_of_week: 1, start_time: '', end_time: '', required_role: '' })

const getSlots = (scheme: 'A' | 'B') =>
  scheme === 'A' ? templateStore.schemeA() : templateStore.schemeB()

function openAddSlot(scheme: 'A' | 'B') { addingToScheme.value = scheme; addSlotOpen.value = true }

async function addSlot() {
  await templateStore.saveTemplate(storeId, { ...newSlot, scheme: addingToScheme.value })
  addSlotOpen.value = false
}

function confirmPublish(scheme: 'A' | 'B') {
  confirm.require({
    message: `Publish Schedule ${scheme}? This will generate shifts for the next 4 weeks.`,
    header: `Publish Schedule ${scheme}`,
    icon: 'pi pi-send',
    acceptProps: { label: 'Publish', icon: 'pi pi-send' },
    rejectProps: { label: 'Cancel', outlined: true },
    accept: () => templateStore.publishTemplate(storeId, scheme),
  })
}

onMounted(() => templateStore.fetchTemplates(storeId))
</script>

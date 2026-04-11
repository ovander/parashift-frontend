<template>
  <div class="flex flex-col h-full bg-gray-50 overflow-hidden">
    <!-- Top bar -->
    <header class="flex items-center gap-4 px-4 py-2 bg-white border-b shadow-sm z-10">
      <!-- Week navigator -->
      <div class="flex items-center gap-1">
        <Button
          icon="pi pi-chevron-left"
          text
          rounded
          size="small"
          @click="ctx.prevWeek()"
        />
        <div class="flex flex-col items-center min-w-28">
          <span class="text-sm font-medium text-gray-700">{{ weekLabel }}</span>
          <div v-if="weekHolidays.length" class="flex flex-wrap justify-center gap-1 mt-0.5">
            <span
              v-for="h in weekHolidays"
              :key="h.date"
              class="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5 leading-tight"
            >🎉 {{ h.name }}</span>
          </div>
        </div>
        <Button
          icon="pi pi-chevron-right"
          text
          rounded
          size="small"
          @click="ctx.nextWeek()"
        />
        <Button
          :label="t('schedule.today')"
          text
          size="small"
          class="ml-1"
          @click="goToCurrentWeek"
        />
      </div>

      <div class="h-5 w-px bg-gray-200" />

      <!-- Mode switcher -->
      <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          v-for="m in modes"
          :key="m.id"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          :class="mode === m.id
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'"
          @click="mode = m.id"
        >
          <i :class="m.icon" class="text-xs" />
          {{ m.label }}
        </button>
      </div>

      <div class="h-5 w-px bg-gray-200" />

      <!-- Layer toggles (only in Operate + Optimize) -->
      <LayerToggles v-if="mode !== 'monitor'" />

      <div class="ml-auto flex items-center gap-2">
        <!-- Panel toggle — drawer on mobile/tablet, sidebar on desktop -->
        <Button
          v-if="!isDesktop"
          icon="pi pi-layout"
          text
          rounded
          size="small"
          v-tooltip="'Show panel'"
          @click="panelDrawerOpen = true"
        />
        <!-- Generate from A/B templates -->
        <Button
          :label="isDesktop ? 'Generate' : undefined"
          icon="pi pi-calendar-plus"
          size="small"
          outlined
          v-tooltip="!isDesktop ? 'Generate shifts from A/B employee templates' : undefined"
          @click="generateDialogOpen = true"
        />
        <div class="h-5 w-px bg-gray-200" />
        <Button
          icon="pi pi-refresh"
          text
          rounded
          size="small"
          :loading="scheduleStore.loading"
          @click="refresh"
        />
        <Button
          data-testid="ai-btn"
          icon="pi pi-sparkles"
          text
          rounded
          size="small"
          v-tooltip="'AI Assistant'"
          @click="aiPanelOpen = true"
        />
      </div>
    </header>

    <!-- Override banner (shown when plan is published/live) -->
    <OverrideEditBanner
      :pending-shift-ids="pendingOverrideShiftIds"
      @cleared="pendingOverrideShiftIds = []"
    />

    <!-- Body: left panel + calendar -->
    <div class="flex flex-1 min-h-0">
      <!-- Left panel — sidebar on desktop only -->
      <template v-if="isDesktop">
        <div
          class="relative flex-shrink-0 transition-all duration-200 overflow-hidden"
          :class="panelOpen ? (mode === 'operate' ? 'w-64' : 'w-72') : 'w-0'"
        >
          <OperateLeftPanel  v-if="mode === 'operate'"  class="h-full" />
          <OptimizeLeftPanel v-else-if="mode === 'optimize'" class="h-full" />
          <MonitorLeftPanel  v-else-if="mode === 'monitor'"  class="h-full" />
        </div>

        <!-- Panel toggle button — sits between the panel and the calendar -->
        <button
          class="flex-shrink-0 self-center z-10 -mx-2.5 w-5 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          :title="panelOpen ? 'Hide panel' : 'Show panel'"
          @click="panelOpen = !panelOpen"
        >
          <i class="pi text-[10px]" :class="panelOpen ? 'pi-chevron-left' : 'pi-chevron-right'" />
        </button>
      </template>

      <!-- Calendar area -->
      <div class="flex-1 min-w-0 overflow-hidden p-2">
        <div v-if="scheduleStore.loading" class="space-y-3 p-2">
          <Skeleton height="60px" v-for="i in 6" :key="i" />
        </div>
        <FullCalendar v-else :options="calendarOptions" class="h-full">
          <template #eventContent="{ event }">
            <ShiftEventContent :event="event" :show-violations="layers.violations" />
          </template>
        </FullCalendar>
      </div>
    </div>

    <!-- Lifecycle bar at bottom -->
    <PlanLifecycleBar
      @publish="publishDialogVisible = true"
      @open-history="historyVisible = true"
    />

    <!-- Dialogs / Drawers -->
    <PublishValidationDialog v-model:visible="publishDialogVisible" />
    <VersionHistoryPanel v-model:visible="historyVisible" />

    <!-- Generate schedule dialog -->
    <ResponsiveDialog
      v-model:visible="generateDialogOpen"
      :header="t('schedule.shell.generateDialogTitle')"
      size="sm"
    >
      <div class="space-y-4 pt-1">
        <p class="text-sm text-gray-600">
          {{ t('schedule.shell.generateDescription') }}
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-gray-700">{{ t('schedule.shell.fromDate') }}</label>
            <DatePicker
              v-model="generateFrom"
              date-format="yy-mm-dd"
              show-icon
              :placeholder="t('common.dateFormatPlaceholder')"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-gray-700">{{ t('schedule.shell.toDate') }}</label>
            <DatePicker
              v-model="generateTo"
              date-format="yy-mm-dd"
              show-icon
              :placeholder="t('common.dateFormatPlaceholder')"
            />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-for="preset in generatePresets"
            :key="preset.label"
            :label="preset.label"
            size="small"
            :outlined="!preset.fullReset"
            :severity="preset.fullReset ? 'warn' : undefined"
            :icon="preset.fullReset ? 'pi pi-refresh' : undefined"
            :title="preset.fullReset ? t('schedule.shell.presetFullResetTooltip') : undefined"
            @click="applyPreset(preset)"
          />
        </div>
        <p v-if="generateFrom && generateTo" class="text-xs text-gray-400">
          {{ t('schedule.shell.range') }} {{ fmtDate(generateFrom) }} → {{ fmtDate(generateTo) }}
          ({{ weeksBetween(generateFrom, generateTo) }} {{ t('schedule.shell.weeks') }})
        </p>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" outlined @click="generateDialogOpen = false" />
        <Button
          :label="t('schedule.shell.generate')"
          icon="pi pi-calendar-plus"
          :loading="generating"
          :disabled="!generateFrom || !generateTo"
          @click="runGenerate"
        />
      </template>
    </ResponsiveDialog>

    <!-- AI panel -->
    <AppDrawer v-model:visible="aiPanelOpen" position="right" size="md">
      <template #header>
        <span class="font-semibold flex items-center gap-2">
          <i class="pi pi-sparkles text-brand-500" /> {{ t('schedule.shell.aiAssistant') }}
        </span>
      </template>
      <AIPanel :store-id="ctx.storeId" />
    </AppDrawer>

    <!-- Left panel as drawer — mobile/tablet only -->
    <AppDrawer v-if="!isDesktop" v-model:visible="panelDrawerOpen" position="left" size="md">
      <template #header>
        <span class="font-semibold capitalize">{{ mode }}</span>
      </template>
      <div class="h-full overflow-y-auto">
        <OperateLeftPanel  v-if="mode === 'operate'"  />
        <OptimizeLeftPanel v-else-if="mode === 'optimize'" />
        <MonitorLeftPanel  v-else-if="mode === 'monitor'"  />
      </div>
    </AppDrawer>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import FullCalendar from '@fullcalendar/vue3'
import AppDrawer from '@/components/common/AppDrawer.vue'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import DatePicker from 'primevue/datepicker'
import Skeleton from 'primevue/skeleton'
import Toast from 'primevue/toast'
import Button from 'primevue/button'

import { useStoreContext } from '@/stores/storeContext'
import { usePlanStore } from '@/stores/planStore'
import { useScheduleStore } from '../stores/scheduleStore'
import { useEmployeeStore } from '@/features/employees/stores/employeeStore'
import { usePlannerCalendar } from '../composables/usePlannerCalendar'
import { usePlannerLayers } from '../composables/usePlannerLayers'
import { usePublicHolidays } from '../composables/usePublicHolidays'
import { createDevlog } from '@/utils/logger'
import { fmtLocal } from '@/utils/dateUtils'

import LayerToggles           from '../components/LayerToggles.vue'
import PlanLifecycleBar       from '../components/PlanLifecycleBar.vue'
import OverrideEditBanner     from '../components/OverrideEditBanner.vue'
import OperateLeftPanel       from '../components/OperateLeftPanel.vue'
import OptimizeLeftPanel      from '../components/OptimizeLeftPanel.vue'
import MonitorLeftPanel       from '../components/MonitorLeftPanel.vue'
import ShiftEventContent      from '../components/ShiftEventContent.vue'
import PublishValidationDialog from '../components/PublishValidationDialog.vue'
import VersionHistoryPanel    from '../components/VersionHistoryPanel.vue'
import AIPanel                from '@/features/ai/components/AIPanel.vue'
import type { ManagerMode } from '@/types'

const { t } = useI18n()
const { locale } = useLocale()
const log = createDevlog('ManagerShellView')

const ctx = useStoreContext()
const planStore = usePlanStore()
const scheduleStore = useScheduleStore()
const employeeStore = useEmployeeStore()
const { layers } = usePlannerLayers()

const { isDesktop, isTabletUp } = useBreakpoint()

const mode = ref<ManagerMode>('operate')
const aiPanelOpen = ref(false)
const publishDialogVisible = ref(false)
const historyVisible = ref(false)
const pendingOverrideShiftIds = ref<string[]>([])
// Left panel: sidebar on desktop, drawer on mobile/tablet.
const panelOpen       = ref(true)  // sidebar open/close on desktop
const panelDrawerOpen = ref(false) // drawer open/close on mobile/tablet

// Auto-collapse sidebar on small screens when breakpoint changes.
watch(isDesktop, (desktop) => {
  if (!desktop) panelOpen.value = false
  else panelOpen.value = true
}, { immediate: false })

// ── Generate schedule from A/B templates ─────────────────────────────────────
const generateDialogOpen = ref(false)
const generateFrom       = ref<Date | null>(null)
const generateTo         = ref<Date | null>(null)
const generating         = ref(false)

interface GeneratePreset {
  label:       string
  futureWeeks: number  // weeks forward from the anchor Monday
  pastWeeks?:  number  // weeks backward from current Monday (default: skip to next Monday)
  fullReset?:  boolean // flag for "full reset" visual styling
}

// Quick presets: short-range go to next Monday; Full reset covers current week ±52w.
const modes = computed(() => [
  { id: 'operate'  as ManagerMode, label: t('schedule.shell.operateMode'),  icon: 'pi pi-calendar-clock' },
  { id: 'optimize' as ManagerMode, label: t('schedule.shell.optimizeMode'), icon: 'pi pi-sliders-h' },
  { id: 'monitor'  as ManagerMode, label: t('schedule.shell.monitorMode'),  icon: 'pi pi-chart-line' },
])

const generatePresets = computed(() => [
  { label: t('schedule.shell.preset1Week'),     futureWeeks: 1 },
  { label: t('schedule.shell.preset2Weeks'),    futureWeeks: 2 },
  { label: t('schedule.shell.preset4Weeks'),    futureWeeks: 4 },
  { label: t('schedule.shell.presetFullReset'), futureWeeks: 52, pastWeeks: 52, fullReset: true },
])

/** Monday of the ISO week that contains d. */
function mondayOfWeek(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - (copy.getDay() + 6) % 7)
  return copy
}

function nextMonday(from: Date): Date {
  const d = new Date(from)
  const day = d.getDay()
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function applyPreset(preset: GeneratePreset) {
  const from = new Date(
    preset.pastWeeks !== undefined
      ? mondayOfWeek(new Date())          // start from current week for full-range presets
      : nextMonday(new Date()),           // start from next week for forward-only presets
  )
  if (preset.pastWeeks) from.setDate(from.getDate() - preset.pastWeeks * 7)

  const to = new Date(from)
  to.setDate(to.getDate() + preset.futureWeeks * 7 - 1)

  generateFrom.value = from
  generateTo.value   = to
}

const fmtDate = (d: Date) => fmtLocal(d)
function weeksBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (7 * 86_400_000)) + 1
}

async function runGenerate() {
  if (!generateFrom.value || !generateTo.value) return
  const fmt = (d: Date) => fmtLocal(d)
  generating.value = true
  try {
    await scheduleStore.generateFromTemplates(
      ctx.storeId,
      fmt(generateFrom.value),
      fmt(generateTo.value),
    )
    generateDialogOpen.value = false
    // Reload the current week so the new shifts appear immediately
    await scheduleStore.fetchWeek(ctx.storeId, ctx.weekStart, true)
  } catch {
    // error toast already shown by store
  } finally {
    generating.value = false
  }
}

// Log mode changes
watch(mode, (next, prev) => {
  log.info(`mode switch: ${prev} → ${next}`)
})

const weekStartRef = computed(() => ctx.weekStart)
const { holidays } = usePublicHolidays(weekStartRef)

// Holidays that fall within the current week (Mon–Sun)
const weekHolidays = computed(() => {
  const start = ctx.weekStart
  const end   = ctx.weekEnd
  return holidays.value.filter((h) => h.date >= start && h.date <= end)
})

const weekLabel = computed(() => {
  const d = new Date(ctx.weekStart + 'T00:00:00')
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
})

const { calendarOptions } = usePlannerCalendar({
  storeId: computed(() => ctx.storeId),
  weekStart: computed(() => ctx.weekStart),
  employees: computed(() => employeeStore.employees ?? []),
  shifts: computed(() => scheduleStore.shifts),
  assignments: computed(() => scheduleStore.assignments),
  onAssign: async (shiftId: string, employeeId: string, revert: () => void) => {
    log.info('onAssign →', { shiftId, employeeId })
    try {
      await scheduleStore.assign(ctx.storeId, shiftId, employeeId)
      log.info('onAssign ← ok', { shiftId, employeeId })
    } catch (err) {
      log.error('onAssign failed — reverting', err)
      revert()
    }
  },
  onUnassign: async (assignmentId: string) => {
    log.info('onUnassign →', { assignmentId })
    await scheduleStore.unassign(ctx.storeId, assignmentId)
    log.info('onUnassign ← ok', { assignmentId })
  },
})

function goToCurrentWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  now.setDate(now.getDate() + diff)
  const weekStart = fmtLocal(now)
  log.info('goToCurrentWeek →', { weekStart })
  ctx.setWeek(weekStart)
}

async function loadWeek() {
  log.info('loadWeek →', { storeId: ctx.storeId, weekStart: ctx.weekStart })
  try {
    await Promise.all([
      scheduleStore.fetchWeek(ctx.storeId, ctx.weekStart),
      planStore.fetchOrCreate(ctx.storeId, ctx.weekStart),
      employeeStore.fetchEmployees?.(ctx.storeId),
    ])
    log.info('loadWeek ← ok', {
      shifts: scheduleStore.shifts.length,
      planState: planStore.state,
    })
  } catch (err) {
    log.error('loadWeek failed', err)
  }
}

async function refresh() {
  log.info('refresh triggered')
  await loadWeek()
}

// Log week/store changes
watch(() => [ctx.storeId, ctx.weekStart], ([storeId, weekStart]) => {
  log.info('context changed →', { storeId, weekStart })
  loadWeek()
}, { immediate: false })

onMounted(() => {
  log.info('mounted', { storeId: ctx.storeId, weekStart: ctx.weekStart })
  if (ctx.storeId) loadWeek()
})
</script>

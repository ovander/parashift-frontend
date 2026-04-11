<template>
  <!-- Outer container fills the FC event cell; overflow:hidden prevents spill -->
  <div class="flex flex-col justify-center px-1 w-full h-full overflow-hidden leading-none gap-px">
    <!-- Row 1: role label + badges -->
    <div class="flex items-center gap-0.5 min-w-0">
      <span class="flex-1 min-w-0 font-medium text-[11px] truncate">{{ event.title }}</span>
      <i
        v-if="needsCover"
        class="pi pi-user-minus text-[10px] text-rose-400 flex-shrink-0"
        :title="t('schedule.shift.needsCoverTooltip')"
      />
      <i
        v-if="worstSev"
        :class="[violationIcon, 'text-[10px] flex-shrink-0']"
        :title="violationTitle"
      />
    </div>
    <!-- Row 2: time range -->
    <span v-if="timeLabel" class="text-[9px] text-white/70 truncate">{{ timeLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EventApi } from '@fullcalendar/core'
import { useRuleViolations } from '../composables/useRuleViolations'

const { t } = useI18n()
const props = defineProps<{ event: EventApi }>()

const { worstSeverity, getViolations } = useRuleViolations()

const shiftId    = computed(() => props.event.extendedProps.shiftId    as string)
const employeeId = computed(() => props.event.extendedProps.employeeId as string)
const needsCover = computed(() => props.event.extendedProps.needsCover  as boolean | undefined)
const worstSev   = computed(() => worstSeverity({ shiftId: shiftId.value, employeeId: employeeId.value }))

const timeLabel = computed(() => {
  const s = props.event.start
  const e = props.event.end
  if (!s) return ''
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return e ? `${fmt(s)} – ${fmt(e)}` : fmt(s)
})

const violationIcon = computed(() => {
  switch (worstSev.value) {
    case 'BLOCKING': return 'pi pi-ban text-red-600'
    case 'WARNING':  return 'pi pi-exclamation-triangle text-amber-500'
    case 'INFO':     return 'pi pi-info-circle text-blue-400'
    default: return ''
  }
})

const violationTitle = computed(() => {
  const vs = getViolations({ shiftId: shiftId.value, employeeId: employeeId.value })
  return vs.map((v) => v.message).join('; ')
})
</script>

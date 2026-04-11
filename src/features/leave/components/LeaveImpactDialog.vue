<template>
  <ResponsiveDialog
    v-model:visible="visible"
    size="md"
    modal
    :closable="!confirming"
    :pt="{ header: { class: 'pb-2' } }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-calendar-times text-orange-500 text-lg" />
        <span class="font-semibold text-gray-900">Review leave request</span>
      </div>
    </template>

    <!-- Loading skeleton while fetching impact -->
    <div v-if="loading" class="space-y-3 py-2">
      <Skeleton height="56px" border-radius="8px" />
      <Skeleton height="40px" border-radius="8px" />
      <Skeleton height="120px" border-radius="8px" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-4 text-center text-red-600 text-sm">
      <i class="pi pi-exclamation-circle text-2xl block mb-2" />
      {{ error }}
    </div>

    <template v-else-if="impact && leave">
      <!-- Employee + leave summary -->
      <div class="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
        <div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-semibold text-brand-700 flex-shrink-0">
          {{ initials(employeeName) }}
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-gray-900 text-sm">{{ employeeName }}</p>
          <p class="text-xs text-gray-500 capitalize mt-0.5">
            {{ t(`leave.type.${leave.type}`, leave.type) }} &nbsp;·&nbsp; {{ leave.start_date }} – {{ leave.end_date }}
            ({{ t('leave.dayCount', dayCount, { named: { count: dayCount } }) }})
          </p>
          <p v-if="leave.reason" class="text-xs text-gray-400 italic mt-0.5 truncate">
            "{{ leave.reason }}"
          </p>
        </div>
      </div>

      <!-- ── No conflicts ─────────────────────────────────────────────── -->
      <div v-if="impact.total_cancellations === 0"
           class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3 mb-4">
        <i class="pi pi-check-circle text-emerald-500 text-xl flex-shrink-0" />
        <div>
          <p class="text-sm font-semibold text-emerald-700">No scheduling conflicts</p>
          <p class="text-xs text-emerald-600 mt-0.5">
            This employee has no assigned shifts during the leave period.
          </p>
        </div>
      </div>

      <!-- ── Impact summary banner ────────────────────────────────────── -->
      <template v-else>
        <!-- Top-level severity banner -->
        <div :class="[
               'rounded-xl border px-4 py-3 flex items-start gap-3 mb-4',
               impact.uncovered_shifts > 0
                 ? 'bg-red-50 border-red-200'
                 : 'bg-orange-50 border-orange-200',
             ]">
          <i :class="[
               'text-xl flex-shrink-0 mt-0.5',
               impact.uncovered_shifts > 0 ? 'pi pi-exclamation-triangle text-red-500' : 'pi pi-info-circle text-orange-500',
             ]" />
          <div class="text-sm">
            <p :class="['font-semibold', impact.uncovered_shifts > 0 ? 'text-red-700' : 'text-orange-700']">
              <template v-if="impact.uncovered_shifts > 0">
                {{ impact.uncovered_shifts }} shift{{ impact.uncovered_shifts !== 1 ? 's' : '' }} will be left uncovered
              </template>
              <template v-else>
                {{ impact.total_cancellations }} shift{{ impact.total_cancellations !== 1 ? 's' : '' }} will be cancelled
              </template>
            </p>
            <p :class="['mt-0.5', impact.uncovered_shifts > 0 ? 'text-red-600' : 'text-orange-600']">
              {{ impact.total_hours_lost.toFixed(1) }}h of scheduled time ·
              {{ impact.total_cancellations }} assignment{{ impact.total_cancellations !== 1 ? 's' : '' }} cancelled
              <span v-if="impact.uncovered_shifts > 0">
                · {{ impact.uncovered_shifts }} with no replacement
              </span>
            </p>
          </div>
        </div>

        <!-- Shift list -->
        <div class="border rounded-xl overflow-hidden mb-4">
          <div class="bg-gray-50 border-b px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Affected shifts
          </div>
          <div class="divide-y max-h-52 overflow-y-auto">
            <div
              v-for="(shift, i) in impact.affected_shifts"
              :key="i"
              class="flex items-center gap-3 px-3 py-2"
            >
              <!-- Date column -->
              <div class="w-20 flex-shrink-0">
                <p class="text-xs font-semibold text-gray-700">{{ formatDate(shift.date) }}</p>
                <p class="text-[11px] text-gray-400">{{ shift.start_time }}–{{ shift.end_time }}</p>
              </div>

              <!-- Role -->
              <div class="flex-1 min-w-0">
                <span class="text-xs text-gray-600 capitalize">{{ shift.role }}</span>
              </div>

              <!-- Coverage badge -->
              <div class="flex-shrink-0">
                <span v-if="shift.will_need_cover"
                      class="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                  <i class="pi pi-exclamation-triangle text-[10px]" /> No cover
                </span>
                <span v-else
                      class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                  <i class="pi pi-users text-[10px]" /> {{ shift.other_assigned }} other{{ shift.other_assigned !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Footer actions -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          text
          :disabled="confirming"
          @click="emit('cancel')"
        />
        <Button
          :label="impact?.total_cancellations === 0 ? 'Approve' : 'Approve anyway'"
          :severity="impact?.uncovered_shifts ?? 0 > 0 ? 'danger' : 'success'"
          :icon="confirming ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
          :disabled="loading || !!error || confirming"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import Button   from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import type { LeaveRequest, LeaveImpact } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  visible:      boolean
  leave:        LeaveRequest | null
  employeeName: string
  impact:       LeaveImpact | null
  loading:      boolean
  error:        string | null
  confirming:   boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

// Two-way binding for PrimeVue Dialog v-model:visible
const visible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

const dayCount = computed(() => {
  if (!props.leave) return 0
  const s = new Date(`${props.leave.start_date}T00:00:00`)
  const e = new Date(`${props.leave.end_date}T00:00:00`)
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
})

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}
</script>

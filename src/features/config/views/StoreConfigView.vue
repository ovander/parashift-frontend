<template>
  <div class="p-6 max-w-4xl mx-auto space-y-10 overflow-y-auto h-full">

    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Store Configuration</h1>
      <!-- DEV ONLY: Audit trail -->
      <Button
        v-if="isDev"
        icon="pi pi-list-check"
        label="Audit"
        size="small"
        severity="secondary"
        outlined
        v-tooltip="'[DEV] Generate config audit trail'"
        @click="auditOpen = true"
      />
    </div>

    <!-- ── Opening hours ─────────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-gray-800">Opening hours</h2>
          <p class="text-sm text-gray-400 mt-0.5">When the store is open each day of the week.</p>
        </div>
        <Button
          label="Save hours"
          icon="pi pi-check"
          size="small"
          :loading="store.savingHours"
          :disabled="!hoursDirty"
          @click="saveHours"
        />
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          v-for="row in hourRows"
          :key="row.day"
          class="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-b-0"
        >
          <!-- Day name -->
          <span class="w-24 text-sm font-medium text-gray-700">{{ row.label }}</span>

          <!-- Open / Closed toggle -->
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="row.open"
              class="w-4 h-4 rounded accent-brand-600"
              @change="markHoursDirty"
            />
            <span class="text-sm" :class="row.open ? 'text-gray-700' : 'text-gray-400'">
              {{ row.open ? 'Open' : 'Closed' }}
            </span>
          </label>

          <!-- Time pickers — only shown when open -->
          <template v-if="row.open">
            <input
              type="time"
              v-model="row.open_time"
              class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              @change="markHoursDirty"
            />
            <span class="text-gray-400 text-sm">→</span>
            <input
              type="time"
              v-model="row.close_time"
              class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              @change="markHoursDirty"
            />
          </template>
          <span v-else class="text-sm text-gray-300 italic">–</span>
        </div>
      </div>
    </section>

    <!-- ── Coverage requirements ──────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-gray-800">Coverage requirements</h2>
          <p class="text-sm text-gray-400 mt-0.5">How many people per role are needed for each time slot.</p>
        </div>
        <Button
          label="Add requirement"
          icon="pi pi-plus"
          size="small"
          outlined
          @click="openAddDialog"
        />
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div v-if="store.loadingRequirements" class="py-10 text-center text-sm text-gray-400">
          Loading…
        </div>
        <div v-else-if="store.requirements.length === 0" class="py-10 text-center text-sm text-gray-400">
          <i class="pi pi-users text-2xl mb-2 block text-gray-300" />
          No coverage requirements yet. Add the first one.
        </div>
        <div v-else>
          <!-- Header row -->
          <div class="grid grid-cols-[120px_130px_80px_160px_40px] gap-4 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 bg-gray-50">
            <span>Day</span>
            <span>Time slot</span>
            <span>Min staff</span>
            <span>Role</span>
            <span></span>
          </div>
          <div
            v-for="req in sortedRequirements"
            :key="req.id"
            class="grid grid-cols-[120px_130px_80px_160px_40px] gap-4 items-center px-5 py-3 border-b border-gray-100 last:border-b-0 text-sm"
          >
            <span class="font-medium text-gray-700">{{ dayLabel(req.day_of_week) }}</span>
            <span class="text-gray-600">{{ req.start_time }} – {{ req.end_time }}</span>
            <span class="text-gray-700">
              <span class="inline-flex items-center gap-1">
                <i class="pi pi-users text-xs text-gray-400" />
                {{ req.min_staff }}
              </span>
            </span>
            <span>
              <span
                v-if="req.required_role"
                class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200"
              >
                {{ req.required_role }}
              </span>
              <span v-else class="text-gray-300 italic text-xs">any</span>
            </span>
            <div class="flex gap-1">
              <Button icon="pi pi-pencil" text rounded size="small" @click="openEditDialog(req)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger"
                @click="deleteReq(req.id)" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Exceptional opening days ─────────────────────────────────── -->
    <section class="space-y-4">
      <div>
        <h2 class="text-base font-semibold text-gray-800">Jours d'ouverture exceptionnelle</h2>
        <p class="text-sm text-gray-400 mt-0.5">
          Dimanches ou jours fériés où le magasin ouvre exceptionnellement. La couverture du personnel sera vérifiée pour ces jours.
        </p>
      </div>

      <!-- List -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div v-if="store.loadingExceptions" class="py-10 text-center text-sm text-gray-400">
          Chargement…
        </div>
        <div v-else-if="upcomingExceptions.length === 0" class="py-8 text-center text-sm text-gray-400">
          <i class="pi pi-calendar text-2xl mb-2 block text-gray-300" />
          Aucune ouverture exceptionnelle planifiée.
        </div>
        <div v-else>
          <div class="grid grid-cols-[1fr_180px_36px] gap-4 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 bg-gray-50">
            <span>Date</span>
            <span>Note</span>
            <span></span>
          </div>
          <div
            v-for="ex in upcomingExceptions"
            :key="ex.id"
            class="grid grid-cols-[1fr_180px_36px] gap-4 items-center px-5 py-3 border-b border-gray-100 last:border-b-0 text-sm"
          >
            <div>
              <span class="font-medium text-gray-800 capitalize">
                {{ formatExDate(ex.date) }}
              </span>
              <span v-if="holidayNameForDate(ex.date)" class="ml-2 text-xs text-amber-700 font-medium">
                🎉 {{ holidayNameForDate(ex.date) }}
              </span>
              <span v-else class="ml-2 text-xs text-gray-400">
                {{ isSunday(ex.date) ? 'Dimanche' : '' }}
              </span>
            </div>
            <span class="text-gray-500 truncate">{{ ex.note || '–' }}</span>
            <Button
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              @click="deleteExc(ex.id)"
            />
          </div>
        </div>
      </div>

      <!-- Add form -->
      <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p class="text-sm font-semibold text-gray-700">Ajouter un jour d'ouverture exceptionnelle</p>
        <div class="flex flex-wrap gap-4 items-end">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Date</label>
            <DatePicker
              v-model="newExDate"
              date-format="yy-mm-dd"
              show-icon
              :min-date="new Date()"
              class="w-44"
              input-class="text-sm"
            />
          </div>
          <div class="flex flex-col gap-1 flex-1 min-w-32">
            <label class="text-xs text-gray-500">Note (optionnel)</label>
            <InputText
              v-model="newExNote"
              class="text-sm"
              placeholder="ex. Inventaire, dimanche de décembre…"
            />
          </div>
          <Button
            label="Ajouter"
            icon="pi pi-plus"
            size="small"
            :disabled="!newExDate"
            :loading="store.savingException"
            @click="addException"
          />
        </div>
      </div>
    </section>

    <!-- ── Audit trail dialog (DEV only) ─────────────────────────────── -->
    <Dialog
      v-if="isDev"
      v-model:visible="auditOpen"
      header="🔍 Config Audit Trail"
      modal
      :style="{ width: '640px', maxHeight: '80vh' }"
      :pt="{ content: { style: 'overflow-y: auto' } }"
    >
      <div class="font-mono text-xs space-y-4 text-gray-800">
        <!-- Header -->
        <div class="bg-gray-100 rounded p-3 space-y-1">
          <div><span class="text-gray-500">Store:</span> {{ storeId }}</div>
          <div><span class="text-gray-500">Generated:</span> {{ new Date().toISOString() }}</div>
        </div>

        <!-- Opening hours -->
        <div>
          <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">
            Opening hours ({{ configAuditData.openDays.length }} open days)
          </div>
          <div class="border border-gray-200 rounded overflow-hidden">
            <div class="grid grid-cols-[120px_90px_90px_80px] gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              <span>Day</span><span>Open</span><span>Close</span><span>Status</span>
            </div>
            <div
              v-for="row in configAuditData.hours"
              :key="row.day"
              class="grid grid-cols-[120px_90px_90px_80px] gap-2 px-3 py-1.5 border-b border-gray-100 last:border-b-0 items-center"
            >
              <span>{{ row.label }}</span>
              <span :class="row.open ? 'text-gray-700' : 'text-gray-300'">{{ row.open ? row.open_time : '—' }}</span>
              <span :class="row.open ? 'text-gray-700' : 'text-gray-300'">{{ row.open ? row.close_time : '—' }}</span>
              <span :class="row.open ? 'text-green-600' : 'text-gray-400'">{{ row.open ? 'open' : 'closed' }}</span>
            </div>
          </div>
        </div>

        <!-- Coverage requirements -->
        <div>
          <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">
            Coverage requirements ({{ configAuditData.requirements.length }})
          </div>
          <div v-if="configAuditData.requirements.length === 0" class="text-gray-400 italic">None configured.</div>
          <div v-else class="border border-gray-200 rounded overflow-hidden">
            <div class="grid grid-cols-[110px_130px_60px_150px] gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              <span>Day</span><span>Time slot</span><span>Min staff</span><span>Required role</span>
            </div>
            <div
              v-for="req in configAuditData.requirements"
              :key="req.id"
              class="grid grid-cols-[110px_130px_60px_150px] gap-2 px-3 py-1.5 border-b border-gray-100 last:border-b-0 items-center"
            >
              <span>{{ req.day_label }}</span>
              <span class="text-gray-600">{{ req.start_time }}–{{ req.end_time }}</span>
              <span>{{ req.min_staff }}</span>
              <span :class="req.required_role ? 'text-blue-700' : 'text-gray-400 italic'">{{ req.required_role || 'any' }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Copy JSON" icon="pi pi-copy" outlined size="small" @click="copyConfigAuditJson" />
        <Button label="Close" size="small" @click="auditOpen = false" />
      </template>
    </Dialog>

    <!-- ── Add / Edit requirement dialog ─────────────────────────────── -->
    <Dialog
      v-model:visible="dialogOpen"
      :header="editingReq ? 'Edit requirement' : 'Add coverage requirement'"
      modal
      :style="{ width: '380px' }"
    >
      <div class="space-y-4 pt-1">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Day of week</label>
          <Select
            v-model="form.day_of_week"
            :options="dayOptions"
            option-label="label"
            option-value="value"
            :loading="optionsStore.loading"
            fluid
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-gray-700">From</label>
            <input
              type="time"
              v-model="form.start_time"
              class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-gray-700">To</label>
            <input
              type="time"
              v-model="form.end_time"
              class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Minimum staff</label>
          <InputNumber v-model="form.min_staff" :min="1" :max="20" showButtons fluid />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Required role <span class="text-gray-400 font-normal">(optional)</span></label>
          <Select
            v-model="form.required_role"
            :options="[{ value: '', label: 'Any role' }, ...optionsStore.jobRoles]"
            option-label="label"
            option-value="value"
            :loading="optionsStore.loading"
            fluid
          />
          <p class="text-xs text-gray-400">Leave empty to count any assigned employee.</p>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" text @click="dialogOpen = false" />
        <Button
          :label="editingReq ? 'Save' : 'Add'"
          icon="pi pi-check"
          :loading="store.savingRequirement"
          @click="submitDialog"
        />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import Button    from 'primevue/button'
import Dialog    from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Select    from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import { useStoreConfigStore, type CoverageRequirement } from '../stores/storeConfigStore'
import { usePublicHolidays } from '@/features/schedule/composables/usePublicHolidays'
import { useStoreContext } from '@/stores/storeContext'
import { useOptionsStore } from '@/stores/optionsStore'

const store        = useStoreConfigStore()
const ctx          = useStoreContext()
const storeId      = computed(() => ctx.storeId)
const optionsStore = useOptionsStore()

// ── Day helpers (labels resolved from options store) ───────────────────
const dayOptions = computed(() => optionsStore.daysOfWeek)
const dayLabel   = (d: number) =>
  optionsStore.daysOfWeek.find(x => x.value === d)?.label ?? `Day ${d}`

// ── Opening hours state ────────────────────────────────────────────────
interface HourRow {
  day:        number
  label:      string
  open:       boolean
  open_time:  string
  close_time: string
}

const hourRows   = ref<HourRow[]>([])
const hoursDirty = ref(false)

function buildHourRows() {
  const map = Object.fromEntries(store.openingHours.map(s => [s.day_of_week, s]))
  hourRows.value = dayOptions.value.map(d => {
    const slot = map[Number(d.value)]
    return {
      day:        Number(d.value),
      label:      d.label,
      open:       !!slot,
      open_time:  slot?.open_time  ?? '09:00',
      close_time: slot?.close_time ?? '18:00',
    }
  })
  hoursDirty.value = false
}

function markHoursDirty() { hoursDirty.value = true }

async function saveHours() {
  const slots = hourRows.value
    .filter(r => r.open)
    .map(r => ({ day_of_week: r.day, open_time: r.open_time, close_time: r.close_time }))
  await store.saveOpeningHours(slots)
  hoursDirty.value = false
}

// ── Coverage requirements ──────────────────────────────────────────────
const sortedRequirements = computed(() =>
  [...store.requirements].sort((a, b) =>
    a.day_of_week !== b.day_of_week
      ? a.day_of_week - b.day_of_week
      : a.start_time.localeCompare(b.start_time),
  ),
)

// ── Dialog ─────────────────────────────────────────────────────────────
const dialogOpen  = ref(false)
const editingReq  = ref<CoverageRequirement | null>(null)
const form = reactive({
  day_of_week:   1,
  start_time:    '09:00',
  end_time:      '18:00',
  min_staff:     1,
  required_role: '',
})

function openAddDialog() {
  editingReq.value     = null
  form.day_of_week     = 1
  form.start_time      = '09:00'
  form.end_time        = '18:00'
  form.min_staff       = 1
  form.required_role   = ''
  dialogOpen.value     = true
}

function openEditDialog(req: CoverageRequirement) {
  editingReq.value     = req
  form.day_of_week     = req.day_of_week
  form.start_time      = req.start_time
  form.end_time        = req.end_time
  form.min_staff       = req.min_staff
  form.required_role   = req.required_role ?? ''
  dialogOpen.value     = true
}

async function submitDialog() {
  const payload = {
    day_of_week:   form.day_of_week,
    start_time:    form.start_time,
    end_time:      form.end_time,
    min_staff:     form.min_staff,
    required_role: form.required_role,
  }
  if (editingReq.value) {
    await store.updateRequirement(storeId.value, editingReq.value.id, payload)
  } else {
    await store.createRequirement(storeId.value, payload)
  }
  dialogOpen.value = false
}

async function deleteReq(id: string) {
  await store.deleteRequirement(storeId.value, id)
}

// ── Exceptional opening days ───────────────────────────────────────────
// Load one year ahead so the list covers all upcoming exceptions.
function todayISO() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}
function oneYearAheadISO() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

// usePublicHolidays expects a week-start ref but we only need the year cache.
// Passing today's date is sufficient — the composable fetches the whole year.
const todayRef  = ref(todayISO())
const { holidays } = usePublicHolidays(todayRef)
const holidayMap   = computed(() => {
  const m = new Map<string, string>()
  for (const h of holidays.value) m.set(h.date, h.name)
  return m
})

// Only show EXTRA_OPEN exceptions, sorted ascending by date
const upcomingExceptions = computed(() =>
  store.exceptions
    .filter((e) => e.type === 'EXTRA_OPEN')
    .sort((a, b) => a.date.localeCompare(b.date)),
)

function holidayNameForDate(isoDate: string): string | undefined {
  return holidayMap.value.get(isoDate)
}

function isSunday(isoDate: string): boolean {
  return new Date(`${isoDate}T00:00:00`).getDay() === 0
}

function formatExDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

const newExDate = ref<Date | null>(null)
const newExNote = ref('')

async function addException() {
  if (!newExDate.value) return
  const pad  = (n: number) => String(n).padStart(2, '0')
  const d    = newExDate.value
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  await store.createException(storeId.value, { date, type: 'EXTRA_OPEN', note: newExNote.value.trim() })
  newExDate.value = null
  newExNote.value = ''
}

async function deleteExc(id: string) {
  await store.deleteException(storeId.value, id)
}

// ── Dev flag ───────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV
const auditOpen = ref(false)

const configAuditData = computed(() => ({
  openDays: hourRows.value.filter(r => r.open),
  hours: hourRows.value.map(r => ({
    day: r.day, label: r.label, open: r.open,
    open_time: r.open_time, close_time: r.close_time,
  })),
  requirements: sortedRequirements.value.map(r => ({
    id:            r.id,
    day_label:     dayLabel(r.day_of_week),
    day_of_week:   r.day_of_week,
    start_time:    r.start_time,
    end_time:      r.end_time,
    min_staff:     r.min_staff,
    required_role: r.required_role ?? '',
  })),
}))

function copyConfigAuditJson() {
  const payload = {
    storeId: storeId.value,
    generatedAt: new Date().toISOString(),
    ...configAuditData.value,
  }
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
}

// ── Init ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    store.fetchOpeningHours(),
    store.fetchRequirements(storeId.value),
    store.fetchExceptions(storeId.value, todayISO(), oneYearAheadISO()),
  ])
  buildHourRows()
})
</script>

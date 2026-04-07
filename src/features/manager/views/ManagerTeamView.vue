<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Team</h1>
      <div class="flex items-center gap-2">
        <!-- DEV ONLY: Audit trail -->
        <Button
          v-if="isDev"
          icon="pi pi-list-check"
          label="Audit"
          size="small"
          severity="secondary"
          outlined
          v-tooltip="'[DEV] Generate team audit trail'"
          @click="auditOpen = true"
        />
        <Button
          icon="pi pi-refresh"
          label="Regenerate schedule"
          size="small"
          severity="warn"
          outlined
          :loading="regenerating"
          v-tooltip="'Regenerate all shifts from A/B templates (±52 weeks)'"
          @click="confirmRegenerate"
        />
        <Button label="Add employee" icon="pi pi-user-plus" @click="openNew" />
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
    >
      <i class="pi pi-exclamation-triangle text-red-500" />
      {{ error }}
      <Button label="Retry" text size="small" class="ml-auto" @click="load" />
    </div>

    <Card>
      <template #header>
        <div class="px-5 pt-4 flex items-center gap-2 text-sm text-gray-500">
          <i class="pi pi-users text-gray-400" />
          <span class="font-semibold text-gray-700">Your store's employees</span>
          <span>· {{ total }} employee{{ total !== 1 ? 's' : '' }}</span>
        </div>
      </template>
      <template #content>
        <DataTable
          :value="employees"
          :loading="loading"
          size="small"
          :rows="20"
          paginator
          :rows-per-page-options="[10, 20, 50]"
        >
          <Column field="name" header="Name" sortable />
          <Column header="Position / Job role" style="width: 200px">
            <template #body="{ data }">
              <div class="flex items-center gap-1.5">
                <Tag :value="data.position" :severity="positionSeverity(data.position)" />
                <span class="text-xs text-gray-500 capitalize">{{ data.job_role }}</span>
              </div>
            </template>
          </Column>
          <Column field="start_date" header="Start date" style="width: 110px" />
          <Column header="Status" style="width: 160px">
            <template #body="{ data }">
              <span
                v-if="data.auth_id"
                class="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200"
              >
                <i class="pi pi-check-circle text-[10px]" /> Active
              </span>
              <span
                v-else-if="data.email"
                class="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
              >
                <i class="pi pi-envelope text-[10px]" /> Invite sent
              </span>
              <button
                v-else-if="data.claim_token"
                class="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 hover:bg-orange-100 transition-colors"
                title="Click to copy invite link"
                @click="copyLink(data.claim_token)"
              >
                <i class="pi pi-link text-[10px]" /> Copy link
              </button>
              <span v-else class="text-xs text-gray-400">—</span>
            </template>
          </Column>
          <Column field="email" header="Email" style="width: 200px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ data.email || '—' }}</span>
            </template>
          </Column>
          <Column header="" :style="isDev ? 'width: 140px' : 'width: 110px'">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  text rounded size="small"
                  v-tooltip.top="'Edit'"
                  @click="openEdit(data)"
                />
                <Button
                  icon="pi pi-calendar"
                  text rounded size="small"
                  severity="info"
                  v-tooltip.top="'A/B Planning'"
                  @click="openPlanning(data)"
                />
                <!-- DEV ONLY: per-employee A/B schedule audit -->
                <Button
                  v-if="isDev"
                  icon="pi pi-receipt"
                  text rounded size="small"
                  severity="secondary"
                  v-tooltip.top="'[DEV] A/B schedule audit'"
                  @click="openEmpAudit(data)"
                />
              </div>
            </template>
          </Column>
          <template #empty>
            <span class="text-sm text-gray-400">No employees yet. Add your first team member above.</span>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- A/B Planning drawer -->
    <WeekTemplateEditorDrawer
      v-if="planningEmployee"
      v-model="planningDrawerOpen"
      :store-id="storeId"
      :employee-id="planningEmployee.id"
      :employee-name="planningEmployee.name"
      @close="planningEmployee = null"
    />

    <!-- Audit trail dialog (DEV only) -->
    <Dialog
      v-if="isDev"
      v-model:visible="auditOpen"
      header="🔍 Team Audit Trail"
      modal
      :style="{ width: '640px', maxHeight: '80vh' }"
      :pt="{ content: { style: 'overflow-y: auto' } }"
    >
      <div class="font-mono text-xs space-y-4 text-gray-800">
        <!-- Header -->
        <div class="bg-gray-100 rounded p-3 space-y-1">
          <div><span class="text-gray-500">Store:</span> {{ storeId }}</div>
          <div><span class="text-gray-500">Total employees:</span> {{ teamAuditData.total }}</div>
          <div><span class="text-gray-500">Generated:</span> {{ new Date().toISOString() }}</div>
        </div>

        <!-- Breakdown by position -->
        <div>
          <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">By position</div>
          <div class="flex gap-4">
            <div
              v-for="(count, pos) in teamAuditData.byPosition"
              :key="pos"
              class="bg-gray-50 border border-gray-200 rounded px-3 py-1.5 flex items-center gap-2"
            >
              <span class="font-semibold">{{ pos }}</span>
              <span class="text-gray-500">× {{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Breakdown by job role -->
        <div>
          <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">By job role</div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(count, role) in teamAuditData.byJobRole"
              :key="role"
              class="bg-blue-50 border border-blue-200 rounded px-3 py-1.5 flex items-center gap-2 text-blue-800"
            >
              <span class="font-semibold">{{ role }}</span>
              <span class="text-blue-500">× {{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Employee list -->
        <div>
          <div class="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">
            Employees ({{ teamAuditData.total }})
          </div>
          <div class="border border-gray-200 rounded overflow-hidden">
            <div class="grid grid-cols-[180px_90px_160px_100px_100px] gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              <span>Name</span><span>Position</span><span>Job role</span><span>Start date</span><span>Status</span>
            </div>
            <div
              v-for="emp in teamAuditData.employees"
              :key="emp.id"
              class="grid grid-cols-[180px_90px_160px_100px_100px] gap-2 px-3 py-1.5 border-b border-gray-100 last:border-b-0 items-center"
            >
              <span class="truncate">{{ emp.name }}</span>
              <span :class="emp.position === 'manager' ? 'text-amber-700 font-semibold' : 'text-gray-600'">{{ emp.position }}</span>
              <span class="text-gray-600">{{ emp.job_role || '—' }}</span>
              <span class="text-gray-500">{{ emp.start_date || '—' }}</span>
              <span :class="emp.status === 'active' ? 'text-green-600' : emp.status === 'invited' ? 'text-amber-600' : 'text-orange-600'">{{ emp.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Copy JSON" icon="pi pi-copy" outlined size="small" @click="copyTeamAuditJson" />
        <Button label="Close" size="small" @click="auditOpen = false" />
      </template>
    </Dialog>

    <!-- Per-employee A/B schedule audit dialog (DEV only) -->
    <Dialog
      v-if="isDev"
      v-model:visible="empAuditOpen"
      :header="`🔍 A/B Schedule — ${auditEmployee?.name ?? ''}`"
      modal
      :style="{ width: '580px', maxHeight: '80vh' }"
      :pt="{ content: { style: 'overflow-y: auto' } }"
    >
      <template v-if="auditEmployee">
        <!-- Loading state while templates are fetched -->
        <div v-if="weekTemplateStore.loading" class="flex items-center gap-2 py-4 text-sm text-gray-500">
          <i class="pi pi-spin pi-spinner" /> Loading templates…
        </div>

        <div v-else class="font-mono text-xs text-gray-800 space-y-4">
          <!-- Employee header -->
          <div class="bg-gray-100 rounded p-3 space-y-1">
            <div><span class="text-gray-500">Name      :</span> {{ auditEmployee.name }}</div>
            <div><span class="text-gray-500">Position  :</span> {{ auditEmployee.position }} / {{ auditEmployee.job_role || '—' }}</div>
            <div><span class="text-gray-500">Start date:</span> {{ auditEmployee.start_date || '—' }}</div>
            <div v-if="auditEmployee.start_date">
              <span class="text-gray-500">A/B rule  :</span>
              {{ empAuditABRule }}
            </div>
            <div><span class="text-gray-500">Generated :</span> {{ new Date().toISOString() }}</div>
          </div>

          <!-- No templates yet -->
          <div
            v-if="empAuditWeekA.length === 0 && empAuditWeekB.length === 0"
            class="text-center py-6 text-gray-400"
          >
            No schedule templates defined yet.
          </div>

          <!-- Week A -->
          <div v-if="empAuditWeekA.length > 0">
            <div class="font-semibold text-amber-700 mb-2 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-sm bg-amber-200 border border-amber-400"></span>
              WEEK A ({{ empAuditWeekA.length }} shift{{ empAuditWeekA.length !== 1 ? 's' : '' }})
            </div>
            <div class="border border-amber-200 rounded overflow-hidden bg-amber-50">
              <div class="grid grid-cols-[110px_80px_80px_1fr] gap-2 px-3 py-1 bg-amber-100 border-b border-amber-200 text-[10px] uppercase tracking-wide text-amber-600 font-semibold">
                <span>Day</span><span>Start</span><span>End</span><span>Role</span>
              </div>
              <div
                v-for="(entry, i) in empAuditWeekA"
                :key="i"
                class="grid grid-cols-[110px_80px_80px_1fr] gap-2 px-3 py-1.5 border-b border-amber-100 last:border-b-0"
              >
                <span class="font-medium text-amber-800">{{ dowLabel(entry.day_of_week) }}</span>
                <span class="text-gray-700">{{ entry.start_time }}</span>
                <span class="text-gray-700">{{ entry.end_time }}</span>
                <span class="text-gray-500 capitalize">{{ entry.role || 'any role' }}</span>
              </div>
            </div>
          </div>

          <!-- Week B -->
          <div v-if="empAuditWeekB.length > 0">
            <div class="font-semibold text-blue-700 mb-2 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-sm bg-blue-200 border border-blue-400"></span>
              WEEK B ({{ empAuditWeekB.length }} shift{{ empAuditWeekB.length !== 1 ? 's' : '' }})
            </div>
            <div class="border border-blue-200 rounded overflow-hidden bg-blue-50">
              <div class="grid grid-cols-[110px_80px_80px_1fr] gap-2 px-3 py-1 bg-blue-100 border-b border-blue-200 text-[10px] uppercase tracking-wide text-blue-600 font-semibold">
                <span>Day</span><span>Start</span><span>End</span><span>Role</span>
              </div>
              <div
                v-for="(entry, i) in empAuditWeekB"
                :key="i"
                class="grid grid-cols-[110px_80px_80px_1fr] gap-2 px-3 py-1.5 border-b border-blue-100 last:border-b-0"
              >
                <span class="font-medium text-blue-800">{{ dowLabel(entry.day_of_week) }}</span>
                <span class="text-gray-700">{{ entry.start_time }}</span>
                <span class="text-gray-700">{{ entry.end_time }}</span>
                <span class="text-gray-500 capitalize">{{ entry.role || 'any role' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <Button label="Copy text" icon="pi pi-copy" outlined size="small" @click="copyEmpAuditText" />
        <Button label="Close" size="small" @click="empAuditOpen = false" />
      </template>
    </Dialog>

    <!-- Create / Edit dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editingEmployee ? 'Edit employee' : 'Add employee'"
      :style="{ width: '460px' }"
      modal
    >
      <div class="space-y-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Full name <span class="text-red-500">*</span></label>
          <InputText v-model="form.name" placeholder="e.g. Jean Dupont" autofocus />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Position <span class="text-red-500">*</span></label>
          <Select
            v-model="form.position"
            :options="positionOptions"
            option-label="label"
            option-value="value"
            :loading="optionsStore.loading"
            placeholder="Select position…"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Job role <span class="text-red-500">*</span></label>
          <Select
            v-model="form.job_role"
            :options="jobRoleOptions"
            option-label="label"
            option-value="value"
            :loading="optionsStore.loading"
            placeholder="Select a job role…"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Start date <span class="text-red-500">*</span></label>
          <DatePicker v-model="form.start_date" date-format="yy-mm-dd" placeholder="YYYY-MM-DD" show-icon />
        </div>
        <div v-if="!editingEmployee" class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Email (sends invite)</label>
          <InputText v-model="form.email" type="email" placeholder="employee@pharmacy.be" />
          <p class="text-xs text-gray-400">Leave blank to generate a manual invite link.</p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button
          :label="editingEmployee ? 'Save' : (form.email ? 'Send invite' : 'Create & generate link')"
          :loading="saving"
          @click="save"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import Dialog    from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select    from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Tag       from 'primevue/tag'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'
import { useStoreContext } from '@/stores/storeContext'
import { useOptionsStore } from '@/stores/optionsStore'
import { useWeekTemplateStore } from '@/features/templates/stores/weekTemplateStore'
import { useScheduleStore } from '@/features/schedule/stores/scheduleStore'
import WeekTemplateEditorDrawer from '../components/WeekTemplateEditorDrawer.vue'

interface Employee {
  id: string
  name: string
  position: string
  job_role: string
  email: string
  auth_id: string
  claim_token?: string
  start_date: string
}

const ui                = useUiStore()
const ctx               = useStoreContext()
const optionsStore      = useOptionsStore()
const weekTemplateStore = useWeekTemplateStore()
const scheduleStore     = useScheduleStore()
const storeId = ctx.storeId

// ── Dev flag ───────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV

// ── ISO week helper (mirrors backend WeekType algorithm) ───────────────
function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

// ── Per-employee A/B audit (DEV only) ──────────────────────────────────
const empAuditOpen  = ref(false)
const auditEmployee = ref<Employee | null>(null)

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function dowLabel(dow: number): string { return DOW_LABELS[dow] ?? `Day ${dow}` }

/** A/B rule string derived from the employee's start_date ISO week parity. */
const empAuditABRule = computed((): string => {
  const sd = auditEmployee.value?.start_date
  if (!sd) return '—'
  const startWeek = isoWeekNumber(new Date(sd + 'T00:00:00'))
  const parity    = startWeek % 2 === 1 ? 'odd' : 'even'
  const opposite  = parity === 'odd' ? 'even' : 'odd'
  return `ISO week ${startWeek} (${parity}) → A = ${parity} weeks, B = ${opposite} weeks`
})

const empAuditWeekA = computed(() =>
  auditEmployee.value
    ? weekTemplateStore.getEntries(auditEmployee.value.id).filter(e => e.week_type === 'A')
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
    : [],
)
const empAuditWeekB = computed(() =>
  auditEmployee.value
    ? weekTemplateStore.getEntries(auditEmployee.value.id).filter(e => e.week_type === 'B')
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
    : [],
)

async function openEmpAudit(emp: Employee) {
  auditEmployee.value = emp
  empAuditOpen.value  = true
  await weekTemplateStore.fetchTemplates(storeId, emp.id)
}

function copyEmpAuditText() {
  const emp = auditEmployee.value
  if (!emp) return
  const SEP = '─'.repeat(52)
  const lines: string[] = [
    SEP,
    `A/B SCHEDULE AUDIT — ${emp.name}`,
    `Generated : ${new Date().toISOString()}`,
    SEP,
    `Name      : ${emp.name}`,
    `Position  : ${emp.position} / ${emp.job_role || '—'}`,
    `Start date: ${emp.start_date || '—'}`,
    `A/B rule  : ${empAuditABRule.value}`,
    SEP,
  ]

  for (const week of ['A', 'B'] as const) {
    const entries = week === 'A' ? empAuditWeekA.value : empAuditWeekB.value
    lines.push(`WEEK ${week}`)
    if (entries.length === 0) {
      lines.push('  (no shifts defined)')
    } else {
      for (const e of entries) {
        const role = e.role || 'any role'
        lines.push(`  ${dowLabel(e.day_of_week).padEnd(10)}  ${e.start_time}–${e.end_time}  (${role})`)
      }
    }
    lines.push('')
  }

  navigator.clipboard.writeText(lines.join('\n'))
  ui.showToast('success', 'Copied to clipboard')
}

// ── Audit trail (DEV only) ─────────────────────────────────────────────
const auditOpen = ref(false)

const teamAuditData = computed(() => {
  const emps = employees.value

  const byPosition: Record<string, number> = {}
  const byJobRole: Record<string, number>  = {}
  for (const e of emps) {
    byPosition[e.position] = (byPosition[e.position] ?? 0) + 1
    if (e.job_role) byJobRole[e.job_role] = (byJobRole[e.job_role] ?? 0) + 1
  }

  return {
    total: emps.length,
    byPosition,
    byJobRole,
    employees: emps.map(e => ({
      id:         e.id,
      name:       e.name,
      position:   e.position,
      job_role:   e.job_role,
      start_date: e.start_date,
      status:     e.auth_id ? 'active' : e.email ? 'invited' : e.claim_token ? 'link' : 'none',
    })),
  }
})

function copyTeamAuditJson() {
  const payload = {
    storeId,
    generatedAt: new Date().toISOString(),
    ...teamAuditData.value,
  }
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
}

const employees = ref<Employee[]>([])
const loading   = ref(true)
const error     = ref('')
const total     = ref(0)

const dialogVisible    = ref(false)
const editingEmployee  = ref<Employee | null>(null)
const saving           = ref(false)

// A/B planning drawer
const planningDrawerOpen = ref(false)
const planningEmployee   = ref<Employee | null>(null)

function openPlanning(emp: Employee) {
  planningEmployee.value   = emp
  planningDrawerOpen.value = true
}

const form = ref({
  name: '',
  position: 'employee',
  job_role: '',
  start_date: null as Date | null,
  email: '',
})

const positionOptions = computed(() => optionsStore.employeePositions)
const jobRoleOptions  = computed(() => optionsStore.jobRoles)

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get<{ data: Employee[]; total: number }>(
      '/api/v1/manager/employees?per_page=200'
    )
    employees.value = data.data ?? []
    total.value     = data.total ?? employees.value.length
  } catch {
    error.value = 'Failed to load team.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openNew() {
  editingEmployee.value = null
  form.value = { name: '', position: 'employee', job_role: '', start_date: null, email: '' }
  dialogVisible.value = true
}

function openEdit(emp: Employee) {
  editingEmployee.value = emp
  form.value = { name: emp.name, position: emp.position, job_role: emp.job_role, start_date: null, email: emp.email }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name.trim() || !form.value.position || !form.value.job_role) {
    ui.showToast('warn', 'Name, position and job role are required')
    return
  }
  saving.value = true
  try {
    if (editingEmployee.value) {
      await api.put(`/api/v1/manager/employees/${editingEmployee.value.id}`, {
        name:     form.value.name,
        position: form.value.position,
        job_role: form.value.job_role,
        ...(form.value.start_date ? { start_date: (form.value.start_date as Date).toISOString() } : {}),
      })
      ui.showToast('success', 'Employee updated')
    } else {
      if (!form.value.start_date) {
        ui.showToast('warn', 'Start date is required')
        saving.value = false
        return
      }
      const resp = await api.post<{ claim_token?: string }>('/api/v1/manager/employees', {
        name:     form.value.name,
        position: form.value.position,
        job_role: form.value.job_role,
        start_date: (form.value.start_date as Date).toISOString(),
        email: form.value.email,
      })
      if (form.value.email) {
        ui.showToast('success', `Invite sent to ${form.value.email}`)
      } else if (resp.data?.claim_token) {
        const link = `${window.location.origin}/claim/${resp.data.claim_token}`
        await navigator.clipboard.writeText(link)
        ui.showToast('success', 'Invite link copied to clipboard')
      } else {
        ui.showToast('success', 'Employee created')
      }
    }
    dialogVisible.value = false
    await load()
  } catch {
    ui.showToast('error', 'Failed to save employee')
  } finally {
    saving.value = false
  }
}

async function copyLink(token: string) {
  const link = `${window.location.origin}/claim/${token}`
  await navigator.clipboard.writeText(link)
  ui.showToast('success', 'Invite link copied to clipboard')
}

function positionSeverity(position: string) {
  if (position === 'manager') return 'warn'
  return 'secondary'
}

// ── Regenerate all weeks from A/B templates ────────────────────────────
const regenerating = ref(false)

/** Return the Monday of the ISO week that contains d. */
function mondayOfWeek(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - (copy.getDay() + 6) % 7)
  return copy
}

async function confirmRegenerate() {
  const ok = window.confirm(
    'Regenerate ALL shifts from A/B templates?\n\n' +
    'This will replace every TEMPLATE-sourced shift for ±52 weeks (from today).\n' +
    'Manually-created shifts are not affected.',
  )
  if (!ok) return

  const thisMon = mondayOfWeek(new Date())
  const from    = new Date(thisMon); from.setDate(from.getDate() - 52 * 7)
  const to      = new Date(thisMon); to.setDate(to.getDate() + 52 * 7 - 1)
  const fmt     = (d: Date) => d.toISOString().split('T')[0]

  regenerating.value = true
  try {
    await scheduleStore.generateFromTemplates(storeId, fmt(from), fmt(to))
  } finally {
    regenerating.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Audit Logs</h1>
      <Button label="Export CSV" icon="pi pi-download" text size="small" @click="exportCSV" />
    </div>

    <!-- Filters -->
    <Card>
      <template #content>
        <div class="flex flex-wrap gap-3 items-end">
          <!-- Store filter -->
          <div class="flex flex-col gap-1 min-w-[200px]">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Store</label>
            <Select
              v-model="filter.storeId"
              :options="storeOptions"
              option-label="name"
              option-value="id"
              placeholder="All stores"
              show-clear
              filter
              class="w-full"
              @change="resetAndLoad"
            />
          </div>

          <!-- Action category -->
          <div class="flex flex-col gap-1 min-w-[180px]">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
            <Select
              v-model="filter.resourceType"
              :options="resourceTypeOptions"
              option-label="label"
              option-value="value"
              placeholder="All categories"
              show-clear
              class="w-full"
              @change="resetAndLoad"
            />
          </div>

          <!-- Action -->
          <div class="flex flex-col gap-1 min-w-[200px]">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Action</label>
            <Select
              v-model="filter.action"
              :options="actionOptions"
              option-label="label"
              option-value="value"
              placeholder="All actions"
              show-clear
              filter
              class="w-full"
              @change="resetAndLoad"
            />
          </div>

          <!-- Date from -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">From</label>
            <DatePicker
              v-model="filter.from"
              date-format="yy-mm-dd"
              placeholder="Start date"
              show-button-bar
              class="w-36"
              @date-select="resetAndLoad"
              @clear-click="resetAndLoad"
            />
          </div>

          <!-- Date to -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
            <DatePicker
              v-model="filter.to"
              date-format="yy-mm-dd"
              placeholder="End date"
              show-button-bar
              class="w-36"
              @date-select="resetAndLoad"
              @clear-click="resetAndLoad"
            />
          </div>

          <Button
            label="Clear filters"
            text
            size="small"
            icon="pi pi-filter-slash"
            class="self-end"
            @click="clearFilters"
          />
        </div>
      </template>
    </Card>

    <!-- Error -->
    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
    >
      <i class="pi pi-exclamation-triangle text-red-500" />
      {{ error }}
      <Button label="Retry" text size="small" class="ml-auto" @click="load" />
    </div>

    <!-- Table -->
    <Card>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          :value="logs"
          :loading="loading"
          size="small"
          :rows="perPage"
          lazy
          :total-records="total"
          paginator
          :rows-per-page-options="[20, 50, 100]"
          data-key="id"
          @page="onPage"
        >
          <!-- Expand toggle -->
          <Column expander style="width: 40px" />

          <!-- Timestamp -->
          <Column field="created_at" header="Time" style="width: 160px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500 whitespace-nowrap">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>

          <!-- Actor -->
          <Column field="actor_name" header="Actor" style="width: 160px">
            <template #body="{ data }">
              <span v-if="data.actor_name" class="text-sm font-medium text-gray-800">{{ data.actor_name }}</span>
              <span v-else class="text-xs text-gray-400 font-mono">{{ data.actor_id.slice(0, 8) }}…</span>
            </template>
          </Column>

          <!-- Action badge -->
          <Column field="action" header="Action" style="width: 200px">
            <template #body="{ data }">
              <span
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                :class="actionBadgeClass(data.action)"
              >
                <i :class="actionIcon(data.action)" class="text-[10px]" />
                {{ actionLabel(data.action) }}
              </span>
            </template>
          </Column>

          <!-- Resource type -->
          <Column field="resource_type" header="Resource" style="width: 130px">
            <template #body="{ data }">
              <span v-if="data.resource_type" class="text-xs text-gray-600 capitalize">
                {{ resourceLabel(data.resource_type) }}
              </span>
              <span v-else class="text-gray-300">—</span>
            </template>
          </Column>

          <!-- Resource ID (truncated) -->
          <Column field="resource_id" header="Resource ID" style="width: 120px">
            <template #body="{ data }">
              <span v-if="data.resource_id" class="text-xs font-mono text-gray-400" :title="data.resource_id">
                {{ data.resource_id.slice(0, 8) }}…
              </span>
              <span v-else class="text-gray-300">—</span>
            </template>
          </Column>

          <!-- Expanded row: show after JSON -->
          <template #expansion="{ data }">
            <div class="px-4 py-3 bg-gray-50 rounded-lg mx-4 my-2">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payload</p>
              <pre class="text-xs text-gray-700 overflow-auto max-h-64 bg-white border border-gray-200 rounded p-3 leading-relaxed">{{ formatPayload(data.after) }}</pre>
            </div>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-10 text-gray-400">
              <i class="pi pi-list text-3xl" />
              <span class="text-sm">No audit log entries match your filters.</span>
            </div>
          </template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import Select    from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import api from '@/composables/useApi'

interface AuditLog {
  id:            string
  actor_id:      string
  actor_name:    string
  action:        string
  resource_type: string
  resource_id:   string
  after:         unknown
  before:        unknown
  created_at:    string
}

interface StoreOption {
  id:   string
  name: string
}

const logs         = ref<AuditLog[]>([])
const loading      = ref(true)
const error        = ref('')
const total        = ref(0)
const page         = ref(1)
const perPage      = ref(20)
const expandedRows = ref<AuditLog[]>([])
const storeOptions = ref<StoreOption[]>([])

const filter = reactive({
  resourceType: null as string | null,
  action:       null as string | null,
  storeId:      null as string | null,
  from:         null as Date | null,
  to:           null as Date | null,
})

// ── Options ──────────────────────────────────────────────────────────────────

const resourceTypeOptions = [
  { label: 'Leave requests', value: 'leave_request' },
  { label: 'Shifts',         value: 'shift'         },
  { label: 'Assignments',    value: 'assignment'    },
  { label: 'Employees',      value: 'employee'      },
  { label: 'Swap requests',  value: 'swap_request'  },
]

const actionOptions = [
  { label: 'Leave created',       value: 'leave.created'      },
  { label: 'Leave updated',       value: 'leave.updated'      },
  { label: 'Shift created',       value: 'shift.created'      },
  { label: 'Shift updated',       value: 'shift.updated'      },
  { label: 'Shift deleted',       value: 'shift.deleted'      },
  { label: 'Assignment created',  value: 'assignment.created' },
  { label: 'Assignment updated',  value: 'assignment.updated' },
  { label: 'Employee created',    value: 'employee.created'   },
  { label: 'Employee updated',    value: 'employee.updated'   },
  { label: 'Swap created',        value: 'swap.created'       },
  { label: 'Swap updated',        value: 'swap.updated'       },
]

// ── API ───────────────────────────────────────────────────────────────────────

function buildQuery() {
  const params = new URLSearchParams({
    page:     String(page.value),
    per_page: String(perPage.value),
  })
  if (filter.action)       params.set('action',        filter.action)
  if (filter.resourceType) params.set('resource_type', filter.resourceType)
  if (filter.storeId)      params.set('store_id',      filter.storeId)
  if (filter.from)         params.set('from', toISO(filter.from))
  if (filter.to)           params.set('to',   toISO(filter.to))
  return params.toString()
}

async function loadStores() {
  try {
    const { data } = await api.get<{ data: StoreOption[] }>('/api/v1/admin/stores?per_page=200')
    storeOptions.value = data.data ?? []
  } catch {
    // non-fatal — store dropdown will just be empty
  }
}

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get<{ data: AuditLog[]; total: number }>(
      `/api/v1/admin/audit-logs?${buildQuery()}`
    )
    logs.value  = data.data  ?? []
    total.value = data.total ?? 0
  } catch {
    error.value = 'Failed to load audit logs.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStores()
  load()
})

function resetAndLoad() {
  page.value = 1
  load()
}

function onPage(e: { page: number; rows: number }) {
  page.value    = e.page + 1
  perPage.value = e.rows
  load()
}

function clearFilters() {
  filter.action       = null
  filter.resourceType = null
  filter.storeId      = null
  filter.from         = null
  filter.to           = null
  resetAndLoad()
}

// ── Display helpers ───────────────────────────────────────────────────────────

// Color palette by resource category.
const categoryColors: Record<string, string> = {
  leave:      'bg-emerald-100 text-emerald-800',
  shift:      'bg-blue-100   text-blue-800',
  assignment: 'bg-indigo-100 text-indigo-800',
  employee:   'bg-amber-100  text-amber-800',
  swap:       'bg-purple-100 text-purple-800',
}

function actionCategory(action: string): string {
  return action.split('.')[0] ?? 'other'
}

function actionBadgeClass(action: string): string {
  return categoryColors[actionCategory(action)] ?? 'bg-gray-100 text-gray-700'
}

const actionIcons: Record<string, string> = {
  leave:      'pi pi-calendar',
  shift:      'pi pi-clock',
  assignment: 'pi pi-user-plus',
  employee:   'pi pi-user',
  swap:       'pi pi-arrows-h',
}

function actionIcon(action: string): string {
  return actionIcons[actionCategory(action)] ?? 'pi pi-circle'
}

const actionLabels: Record<string, string> = {
  'leave.created':      'Leave created',
  'leave.updated':      'Leave updated',
  'shift.created':      'Shift created',
  'shift.updated':      'Shift updated',
  'shift.deleted':      'Shift deleted',
  'assignment.created': 'Assignment created',
  'assignment.updated': 'Assignment updated',
  'employee.created':   'Employee created',
  'employee.updated':   'Employee updated',
  'swap.created':       'Swap created',
  'swap.updated':       'Swap updated',
}

function actionLabel(action: string): string {
  return actionLabels[action] ?? action
}

const resourceLabels: Record<string, string> = {
  leave_request: 'Leave',
  shift:         'Shift',
  assignment:    'Assignment',
  employee:      'Employee',
  swap_request:  'Swap',
}

function resourceLabel(type: string): string {
  return resourceLabels[type] ?? type
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function formatPayload(after: unknown): string {
  if (!after) return '(empty)'
  try {
    const parsed = typeof after === 'string' ? JSON.parse(after) : after
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(after)
  }
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV() {
  const header = ['Time', 'Actor', 'Action', 'Resource', 'Resource ID']
  const rows = logs.value.map((l) => [
    l.created_at,
    l.actor_name || l.actor_id,
    l.action,
    l.resource_type,
    l.resource_id,
  ])
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `audit-logs-${toISO(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

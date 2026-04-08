<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Employees</h1>
    </div>

    <!-- Filters bar -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Job role filter -->
      <Select
        v-model="filters.job_role"
        :options="jobRoleOptions"
        option-label="label"
        option-value="value"
        placeholder="All job roles"
        show-clear
        class="w-44"
        @change="load"
      />
      <!-- Status filter -->
      <Select
        v-model="filters.status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        placeholder="All statuses"
        show-clear
        class="w-44"
        @change="load"
      />
      <!-- Store filter -->
      <Select
        v-model="filters.store_id"
        :options="storeOptions"
        option-label="label"
        option-value="value"
        placeholder="All stores"
        show-clear
        class="w-48"
        :loading="storesLoading"
        @change="load"
      />
      <!-- Integrity filter (pre-selected from dashboard routing) -->
      <Select
        v-model="filters.integrity"
        :options="integrityOptions"
        option-label="label"
        option-value="value"
        placeholder="Data issues"
        show-clear
        class="w-44"
        @change="load"
      />
      <Button
        label="Reset"
        text
        icon="pi pi-filter-slash"
        size="small"
        @click="resetFilters"
      />
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
      <template #content>
        <DataTable
          :value="employees"
          :loading="loading"
          size="small"
          :rows="20"
          paginator
          :rows-per-page-options="[10, 20, 50]"
          lazy
          :total-records="total"
          @page="onPage"
        >
          <Column field="name" header="Name" />
          <Column header="Position / Job role" style="width: 210px">
            <template #body="{ data }">
              <div class="flex items-center gap-1.5">
                <Tag :value="data.position || '—'" :severity="positionSeverity(data.position)" />
                <span class="text-xs text-gray-500 capitalize">{{ data.job_role || '—' }}</span>
              </div>
            </template>
          </Column>
          <Column field="store_name" header="Store" style="width: 180px">
            <template #body="{ data }">
              <span class="text-sm text-gray-600">{{ data.store_name || '—' }}</span>
            </template>
          </Column>
          <Column header="Status" style="width: 150px">
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
                <i class="pi pi-envelope text-[10px]" /> Pending invite
              </span>
              <span
                v-else-if="data.claim_token"
                class="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200"
              >
                <i class="pi pi-link text-[10px]" /> Unclaimed link
              </span>
              <span v-else class="text-xs text-gray-400">—</span>
            </template>
          </Column>
          <Column field="email" header="Email" style="width: 200px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ data.email || '—' }}</span>
            </template>
          </Column>
          <Column field="start_date" header="Start date" style="width: 110px" />
          <template #empty>
            <span class="text-sm text-gray-400">No employees found.</span>
          </template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import Select    from 'primevue/select'
import Tag       from 'primevue/tag'
import api from '@/composables/useApi'
import { useOptionsStore } from '@/stores/optionsStore'

interface Employee {
  id: string
  name: string
  position: string
  job_role: string
  store_name: string
  email: string
  auth_id: string
  claim_token?: string
  start_date: string
}

interface Store {
  id: string
  name: string
}

const route = useRoute()

// ── Metadata (loaded from backend) ────────────────────────────────────────────
const optionsStore = useOptionsStore()
// Job role filter options come from the general options store (GET /api/v1/options).
const jobRoleOptions = computed(() => optionsStore.jobRoles)

// Admin-specific filter lists come from GET /api/v1/admin/metadata.
interface AdminOption { value: string; label: string }
const statusOptions    = ref<AdminOption[]>([])
const integrityOptions = ref<AdminOption[]>([])

async function loadAdminMetadata() {
  try {
    const { data } = await api.get<{
      employeeStatuses: AdminOption[]
      integrityFilters: AdminOption[]
    }>('/api/v1/admin/metadata')
    statusOptions.value    = data.employeeStatuses ?? []
    integrityOptions.value = data.integrityFilters  ?? []
  } catch { /* non-critical — filters remain empty */ }
}

// ── State ─────────────────────────────────────────────────────────────────────
const employees    = ref<Employee[]>([])
const loading      = ref(true)
const error        = ref('')
const total        = ref(0)
const page         = ref(1)
const perPage      = ref(20)

const storeOptions  = ref<{ label: string; value: string }[]>([])
const storesLoading = ref(false)

// Reactive filters — pre-populated from query params (dashboard deep-links)
const filters = reactive({
  job_role:  '',
  status:    (route.query.status as string) || '',
  store_id:  '',
  integrity: (route.query.filter as string) || '',
})

// ── Data fetching ─────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value   = ''
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      per_page: String(perPage.value),
    })
    if (filters.job_role)  params.set('job_role', filters.job_role)
    if (filters.status)    params.set('status', filters.status)
    if (filters.store_id)  params.set('store_id', filters.store_id)
    if (filters.integrity) params.set('filter', filters.integrity)

    const { data } = await api.get<{ data: Employee[]; total: number }>(
      `/api/v1/admin/employees?${params.toString()}`
    )
    employees.value = data.data ?? []
    total.value     = data.total ?? 0
  } catch {
    error.value = 'Failed to load employees.'
  } finally {
    loading.value = false
  }
}

async function loadStores() {
  storesLoading.value = true
  try {
    const { data } = await api.get<{ data: Store[] }>('/api/v1/admin/stores?per_page=200')
    storeOptions.value = (data.data ?? []).map((s: { name: string; id: string }) => ({ label: s.name, value: s.id }))
  } finally {
    storesLoading.value = false
  }
}

onMounted(() => {
  load()
  loadStores()
  loadAdminMetadata()
})

function onPage(e: { page: number; rows: number }) {
  page.value    = e.page + 1
  perPage.value = e.rows
  load()
}

function resetFilters() {
  filters.job_role  = ''
  filters.status    = ''
  filters.store_id  = ''
  filters.integrity = ''
  page.value = 1
  load()
}

function positionSeverity(position: string) {
  if (position === 'manager') return 'warn'
  return 'secondary'
}
</script>

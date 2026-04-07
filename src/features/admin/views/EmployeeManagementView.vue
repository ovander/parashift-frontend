<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Employees</h1>
      <Button
        label="Add Employee"
        icon="pi pi-user-plus"
        :disabled="!selectedStoreId"
        @click="openNew"
      />
    </div>

    <!-- Store selector -->
    <div class="flex items-center gap-3">
      <label class="text-sm font-medium text-gray-600 whitespace-nowrap">Store <span class="text-red-500">*</span></label>
      <Select
        v-model="selectedStoreId"
        :options="storeOptions"
        option-label="label"
        option-value="value"
        placeholder="Select a store to manage its employees…"
        class="w-80"
        :loading="storesLoading"
        @change="onStoreChange"
      />
      <span v-if="!selectedStoreId" class="text-xs text-amber-600 flex items-center gap-1">
        <i class="pi pi-info-circle" />
        Employees must belong to a store
      </span>
    </div>

    <Card>
      <template v-if="selectedStoreId" #header>
        <div class="px-5 pt-4 flex items-center gap-2">
          <i class="pi pi-building text-gray-400 text-sm" />
          <span class="text-sm font-semibold text-gray-700">{{ selectedStoreName }}</span>
          <span class="text-xs text-gray-400">· {{ employees.length }} employee{{ employees.length !== 1 ? 's' : '' }}</span>
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
          <Column field="start_date" header="Start date" style="width: 120px" />
          <Column header="Status / Contact" style="width: 180px">
            <template #body="{ data }">
              <span v-if="!data.auth_id || data.claim_token" class="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <i class="pi pi-clock text-[10px]" />
                Pending invite
              </span>
              <span v-else-if="data.email" class="text-xs text-gray-500 truncate max-w-[160px] block" :title="data.email">
                <i class="pi pi-envelope text-gray-300 mr-1" />{{ data.email }}
              </span>
              <span v-else class="font-mono text-xs text-gray-400">{{ data.auth_id?.slice(0, 12) }}…</span>
            </template>
          </Column>
          <Column header="" style="width: 100px">
            <template #body="{ data }">
              <div class="flex items-center gap-1">
                <Button
                  v-if="data.claim_token"
                  icon="pi pi-link"
                  text
                  rounded
                  size="small"
                  v-tooltip="'Copy invite link'"
                  @click="copyInviteLink(data)"
                />
                <Button icon="pi pi-pencil" text rounded size="small" v-tooltip="'Edit'" @click="openEdit(data)" />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="py-10 text-center text-sm text-gray-400">
              {{ selectedStoreId ? 'No employees in this store.' : 'Select a store to see its employees.' }}
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create / Edit dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editingEmployee ? `Edit — ${editingEmployee.name}` : `Add employee to ${selectedStoreName}`"
      modal
      :style="{ width: '440px' }"
      @hide="resetForm"
    >
      <div class="space-y-4 pt-1">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Full name <span class="text-red-500">*</span></label>
          <InputText
            v-model="form.name"
            fluid
            autofocus
            placeholder="e.g. Marie Dupont"
            :invalid="errors.name"
            @input="errors.name = false"
          />
          <span v-if="errors.name" class="text-xs text-red-500">Name is required</span>
        </div>

        <!-- Position -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Position <span class="text-red-500">*</span></label>
          <Select
            v-model="form.position"
            :options="positionOptions"
            option-label="label"
            option-value="value"
            :loading="optionsStore.loading"
            fluid
            :invalid="errors.position"
            @change="errors.position = false"
          />
          <span v-if="errors.position" class="text-xs text-red-500">Position is required</span>
        </div>

        <!-- Job role -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Job role <span class="text-red-500">*</span></label>
          <Select
            v-model="form.job_role"
            :options="jobRoleOptions"
            option-label="label"
            option-value="value"
            :loading="optionsStore.loading"
            fluid
            placeholder="Select a job role…"
            :invalid="errors.job_role"
            @change="errors.job_role = false"
          />
          <span v-if="errors.job_role" class="text-xs text-red-500">Job role is required</span>
        </div>

        <!-- Email (create only) — triggers automatic Socrate invite -->
        <div v-if="!editingEmployee" class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">
            Email address
            <span class="text-xs text-gray-400 font-normal ml-1">(recommended)</span>
          </label>
          <InputText
            v-model="form.email"
            type="email"
            fluid
            placeholder="marie.dupont@pharmacie.be"
            :invalid="errors.email"
            @input="errors.email = false"
          />
          <p class="text-xs text-gray-400">
            ParaShift will create their Socrate account and send an invite email automatically.
            Leave empty to get a manual invite link instead.
          </p>
          <span v-if="errors.email" class="text-xs text-red-500">Enter a valid email address</span>
        </div>

        <!-- Start date -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">
            Start date <span class="text-red-500">*</span>
            <span class="text-xs text-gray-400 font-normal ml-1">(used for A/B week calculation)</span>
          </label>
          <InputText
            v-model="form.startDate"
            fluid
            placeholder="YYYY-MM-DD"
            :invalid="errors.startDate"
            @input="errors.startDate = false"
          />
          <span v-if="errors.startDate" class="text-xs text-red-500">{{ errors.startDateMsg || 'Start date is required' }}</span>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button
          :label="editingEmployee ? 'Save' : (form.email ? 'Create & invite' : 'Create & generate link')"
          :icon="!editingEmployee ? (form.email ? 'pi pi-envelope' : 'pi pi-link') : undefined"
          :loading="saving"
          @click="save"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import Tag       from 'primevue/tag'
import Select    from 'primevue/select'
import Dialog    from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'
import { useOptionsStore } from '@/stores/optionsStore'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Store    { id: string; name: string }
interface Employee { id: string; name: string; position: string; job_role: string; auth_id: string; email?: string; start_date: string; claim_token?: string }

// ── State ──────────────────────────────────────────────────────────────────────
const ui           = useUiStore()
const optionsStore = useOptionsStore()

const storesLoading    = ref(false)
const storeOptions     = ref<{ label: string; value: string }[]>([])
const selectedStoreId  = ref<string | null>(null)
const selectedStoreName = computed(
  () => storeOptions.value.find((s) => s.value === selectedStoreId.value)?.label ?? ''
)

const loading   = ref(false)
const employees = ref<Employee[]>([])

// Dialog
const dialogVisible    = ref(false)
const editingEmployee  = ref<Employee | null>(null)
const saving           = ref(false)

const form = reactive({ name: '', position: 'employee', job_role: '', email: '', startDate: '' })
const errors = reactive({ name: false, position: false, job_role: false, email: false, startDate: false, startDateMsg: '' })

const positionOptions = computed(() => optionsStore.employeePositions)
const jobRoleOptions  = computed(() => optionsStore.jobRoles)

// ── Store loading ──────────────────────────────────────────────────────────────
async function loadStores() {
  storesLoading.value = true
  try {
    const { data } = await api.get<{ data: Store[] }>('/api/v1/admin/stores?per_page=100')
    storeOptions.value = (data.data ?? []).map((s) => ({ label: s.name, value: s.id }))
    if (storeOptions.value.length === 1) {
      selectedStoreId.value = storeOptions.value[0].value
      await loadEmployees(selectedStoreId.value)
    }
  } catch {
    ui.showToast('error', 'Failed to load stores')
  } finally {
    storesLoading.value = false
  }
}

async function loadEmployees(storeId: string) {
  loading.value = true
  employees.value = []
  try {
    const { data } = await api.get<{ data: Employee[] }>(`/api/v1/stores/${storeId}/employees?per_page=200`)
    employees.value = data.data ?? []
  } catch {
    ui.showToast('error', 'Failed to load employees')
  } finally {
    loading.value = false
  }
}

function onStoreChange() {
  if (selectedStoreId.value) loadEmployees(selectedStoreId.value)
  else employees.value = []
}

// ── Dialog helpers ─────────────────────────────────────────────────────────────
function openNew() {
  editingEmployee.value = null
  dialogVisible.value   = true
}

function openEdit(e: Employee) {
  editingEmployee.value = e
  form.name      = e.name
  form.position  = e.position
  form.job_role  = e.job_role
  form.email     = e.email ?? ''
  form.startDate = e.start_date
  dialogVisible.value = true
}

function resetForm() {
  editingEmployee.value = null
  form.name = ''; form.position = 'employee'; form.job_role = ''; form.email = ''; form.startDate = ''
  errors.name = false; errors.position = false; errors.job_role = false; errors.email = false; errors.startDate = false
}

// ── Validation ─────────────────────────────────────────────────────────────────
function validate(): boolean {
  let ok = true
  errors.name      = !form.name.trim()
  errors.position  = !form.position
  errors.job_role  = !form.job_role
  errors.email     = false
  errors.startDate = false
  errors.startDateMsg = ''

  // If an email is provided, validate its format.
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = true
    ok = false
  }

  if (!form.startDate.trim()) {
    errors.startDate = true
    ok = false
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate.trim()) || isNaN(Date.parse(form.startDate))) {
    errors.startDate    = true
    errors.startDateMsg = 'Use YYYY-MM-DD format (e.g. 2024-01-15)'
    ok = false
  }

  if (errors.name || errors.position || errors.job_role) ok = false
  return ok
}

// ── Save ───────────────────────────────────────────────────────────────────────
async function save() {
  if (!validate()) return
  if (!selectedStoreId.value) return

  saving.value = true
  try {
    if (editingEmployee.value) {
      await api.put(
        `/api/v1/stores/${selectedStoreId.value}/employees/${editingEmployee.value.id}`,
        {
          name:       form.name.trim(),
          position:   form.position,
          job_role:   form.job_role,
          start_date: new Date(form.startDate).toISOString(),
        },
      )
      ui.showToast('success', 'Employee updated')
    } else {
      const payload: Record<string, string> = {
        name:       form.name.trim(),
        position:   form.position,
        job_role:   form.job_role,
        start_date: new Date(form.startDate).toISOString(),
      }
      if (form.email.trim()) payload.email = form.email.trim()

      const { data } = await api.post<{ id: string; email?: string; claim_token?: string }>(
        `/api/v1/stores/${selectedStoreId.value}/employees`,
        payload,
      )

      if (data.email) {
        // Socrate invite sent — no manual link needed.
        ui.showToast('success', `Invite sent to ${data.email}`)
      } else if (data.claim_token) {
        // Fallback: auto-copy the manual invite link to clipboard.
        const url = buildInviteURL(data.claim_token)
        await copyToClipboard(url)
        ui.showToast('success', 'Employee created — invite link copied to clipboard!')
      } else {
        ui.showToast('success', 'Employee created')
      }
    }
    dialogVisible.value = false
    await loadEmployees(selectedStoreId.value)
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? 'Failed to save employee'
    ui.showToast('error', msg)
  } finally {
    saving.value = false
  }
}

// ── Invite link helpers ────────────────────────────────────────────────────────
function buildInviteURL(token: string): string {
  return `${window.location.origin}/claim/${token}`
}

async function copyInviteLink(emp: Employee) {
  if (!emp.claim_token) return
  const url = buildInviteURL(emp.claim_token)
  await copyToClipboard(url)
  ui.showToast('success', 'Invite link copied to clipboard')
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // fallback for non-secure contexts
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function positionSeverity(position: string) {
  if (position === 'manager') return 'warn'
  return 'secondary'
}

onMounted(loadStores)
</script>

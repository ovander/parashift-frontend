<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">{{ t('admin.empMgmt.title') }}</h1>
      <Button
        :label="t('admin.empMgmt.addEmployee')"
        icon="pi pi-user-plus"
        :disabled="!selectedStoreId"
        @click="openNew"
      />
    </div>

    <!-- Store selector -->
    <div class="flex items-center gap-3">
      <label class="text-sm font-medium text-gray-600 whitespace-nowrap">{{ t('common.store') }} <span class="text-red-500">*</span></label>
      <Select
        v-model="selectedStoreId"
        :options="storeOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('admin.empMgmt.selectStorePlaceholder')"
        class="w-80"
        :loading="storesLoading"
        @change="onStoreChange"
      />
      <span v-if="!selectedStoreId" class="text-xs text-amber-600 flex items-center gap-1">
        <i class="pi pi-info-circle" />
        {{ t('admin.empMgmt.storeBelongsHint') }}
      </span>
    </div>

    <Card>
      <template v-if="selectedStoreId" #header>
        <div class="px-5 pt-4 flex items-center gap-2">
          <i class="pi pi-building text-gray-400 text-sm" />
          <span class="text-sm font-semibold text-gray-700">{{ selectedStoreName }}</span>
          <span class="text-xs text-gray-400">· {{ t('admin.empMgmt.employeeCount', employees.length, { named: { count: employees.length } }) }}</span>
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
          <Column field="name" :header="t('common.name')" sortable />
          <Column v-if="!isMobile" :header="t('admin.employees.positionJobRole')" style="width: 200px">
            <template #body="{ data }">
              <div class="flex items-center gap-1.5">
                <Tag :value="data.position" :severity="positionSeverity(data.position)" />
                <span class="text-xs text-gray-500 capitalize">{{ data.job_role }}</span>
              </div>
            </template>
          </Column>
          <Column v-if="isDesktop" field="start_date" :header="t('common.startDate')" style="width: 120px" />
          <Column :header="t('admin.empMgmt.statusContact')" style="width: 180px">
            <template #body="{ data }">
              <span v-if="!data.auth_id || data.claim_token" class="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <i class="pi pi-clock text-[10px]" />
                {{ t('admin.employees.pendingInvite') }}
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
                  v-tooltip="t('admin.empMgmt.copyInviteLink')"
                  @click="copyInviteLink(data)"
                />
                <Button icon="pi pi-pencil" text rounded size="small" v-tooltip="t('common.edit')" @click="openEdit(data)" />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="py-10 text-center text-sm text-gray-400">
              {{ selectedStoreId ? t('admin.empMgmt.noEmployeesInStore') : t('admin.empMgmt.selectStoreFirst') }}
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create / Edit dialog -->
    <ResponsiveDialog
      v-model:visible="dialogVisible"
      :header="editingEmployee ? t('admin.empMgmt.editTitle', { name: editingEmployee.name }) : t('admin.empMgmt.addTitle', { store: selectedStoreName })"
      size="sm"
      @hide="resetForm"
    >
      <div class="space-y-4 pt-1">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">{{ t('common.fullName') }} <span class="text-red-500">*</span></label>
          <InputText
            v-model="form.name"
            fluid
            autofocus
            placeholder="e.g. Marie Dupont"
            :invalid="errors.name"
            @input="errors.name = false"
          />
          <span v-if="errors.name" class="text-xs text-red-500">{{ t('admin.empMgmt.errorName') }}</span>
        </div>

        <!-- Position -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">{{ t('common.position') }} <span class="text-red-500">*</span></label>
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
          <span v-if="errors.position" class="text-xs text-red-500">{{ t('admin.empMgmt.errorPosition') }}</span>
        </div>

        <!-- Job role -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">{{ t('common.jobRole') }} <span class="text-red-500">*</span></label>
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
          <span v-if="errors.job_role" class="text-xs text-red-500">{{ t('admin.empMgmt.errorJobRole') }}</span>
        </div>

        <!-- Email (create only) — triggers automatic Socrate invite -->
        <div v-if="!editingEmployee" class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">
            {{ t('admin.empMgmt.emailAddress') }}
            <span class="text-xs text-gray-400 font-normal ml-1">{{ t('admin.empMgmt.recommended') }}</span>
          </label>
          <InputText
            v-model="form.email"
            type="email"
            fluid
            placeholder="marie.dupont@pharmacie.be"
            :invalid="errors.email"
            @input="errors.email = false"
          />
          <p class="text-xs text-gray-400">{{ t('admin.empMgmt.emailHint') }}</p>
          <span v-if="errors.email" class="text-xs text-red-500">{{ t('admin.empMgmt.errorEmail') }}</span>
        </div>

        <!-- Start date -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">
            {{ t('common.startDate') }} <span class="text-red-500">*</span>
            <span class="text-xs text-gray-400 font-normal ml-1">{{ t('admin.empMgmt.startDateHint') }}</span>
          </label>
          <InputText
            v-model="form.startDate"
            fluid
            placeholder="YYYY-MM-DD"
            :invalid="errors.startDate"
            @input="errors.startDate = false"
          />
          <span v-if="errors.startDate" class="text-xs text-red-500">{{ errors.startDateMsg || t('admin.empMgmt.errorStartDate') }}</span>
        </div>
      </div>

      <template #footer>
        <Button :label="t('common.cancel')" text @click="dialogVisible = false" />
        <Button
          :label="editingEmployee ? t('common.save') : (form.email ? t('admin.empMgmt.createInvite') : t('admin.empMgmt.createLink'))"
          :icon="!editingEmployee ? (form.email ? 'pi pi-envelope' : 'pi pi-link') : undefined"
          :loading="saving"
          @click="save"
        />
      </template>
    </ResponsiveDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import Tag       from 'primevue/tag'
import Select    from 'primevue/select'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import InputText from 'primevue/inputtext'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'
import { useOptionsStore } from '@/stores/optionsStore'
import { useBreakpoint } from '@/composables/useBreakpoint'

const { isMobile, isDesktop } = useBreakpoint()

// ── Types ──────────────────────────────────────────────────────────────────────
interface Store    { id: string; name: string }
interface Employee { id: string; name: string; position: string; job_role: string; auth_id: string; email?: string; start_date: string; claim_token?: string }

// ── State ──────────────────────────────────────────────────────────────────────
const { t }        = useI18n()
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
    storeOptions.value = (data.data ?? []).map((s: { name: string; id: string }) => ({ label: s.name, value: s.id }))
    if (storeOptions.value.length === 1) {
      selectedStoreId.value = storeOptions.value[0].value
      await loadEmployees(selectedStoreId.value)
    }
  } catch {
    ui.showToast('error', t('admin.employees.loadStoresFailed'))
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
    ui.showToast('error', t('admin.employees.loadFailed'))
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
    errors.startDateMsg = t('admin.empMgmt.errorStartDateFormat')
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
      ui.showToast('success', t('admin.employees.updated'))
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
        ui.showToast('success', t('admin.employees.inviteSent', { email: data.email }))
      } else if (data.claim_token) {
        // Fallback: auto-copy the manual invite link to clipboard.
        const url = buildInviteURL(data.claim_token)
        await copyToClipboard(url)
        ui.showToast('success', t('admin.employees.createdWithLink'))
      } else {
        ui.showToast('success', t('admin.employees.created'))
      }
    }
    dialogVisible.value = false
    await loadEmployees(selectedStoreId.value)
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? t('errors.loadFailed')
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
  ui.showToast('success', t('admin.employees.linkCopied'))
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

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Managers</h1>
      <Button label="Invite manager" icon="pi pi-user-plus" @click="openNew" />
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
          :value="managers"
          :loading="loading"
          size="small"
          :rows="20"
          paginator
          :rows-per-page-options="[10, 20, 50]"
        >
          <Column field="name" header="Name" sortable />
          <Column field="store_name" header="Store" style="width: 200px">
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
                <i class="pi pi-envelope text-[10px]" /> Invite sent
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200"
              >
                <i class="pi pi-link text-[10px]" /> Link pending
              </span>
            </template>
          </Column>
          <Column field="email" header="Email" style="width: 220px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ data.email || '—' }}</span>
            </template>
          </Column>
          <Column field="start_date" header="Start date" style="width: 110px" />
          <Column header="" style="width: 120px">
            <template #body="{ data }">
              <div class="flex items-center gap-1">
                <Button
                  v-if="data.email && !data.auth_id"
                  icon="pi pi-send"
                  text
                  rounded
                  size="small"
                  severity="secondary"
                  v-tooltip.top="'Resend invite'"
                  @click="resendInvite(data)"
                />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" />
              </div>
            </template>
          </Column>
          <template #empty>
            <span class="text-sm text-gray-400">No managers yet.</span>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Invite dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      header="Invite manager"
      :style="{ width: '460px' }"
      modal
    >
      <div class="space-y-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Full name <span class="text-red-500">*</span></label>
          <InputText v-model="form.name" placeholder="e.g. Sophie Martin" autofocus />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Store <span class="text-red-500">*</span></label>
          <Select
            v-model="form.store_id"
            :options="storeOptions"
            option-label="label"
            option-value="value"
            placeholder="Select store…"
            :loading="storesLoading"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Start date <span class="text-red-500">*</span></label>
          <DatePicker v-model="form.start_date" date-format="yy-mm-dd" placeholder="YYYY-MM-DD" show-icon />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Email (sends invite)</label>
          <InputText v-model="form.email" type="email" placeholder="manager@pharmacy.be" />
          <p class="text-xs text-gray-400">Leave blank to generate a manual invite link instead.</p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button :label="form.email ? 'Send invite' : 'Generate link'" :loading="saving" @click="save" />
      </template>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import Button      from 'primevue/button'
import Card        from 'primevue/card'
import DataTable   from 'primevue/datatable'
import Column      from 'primevue/column'
import Dialog      from 'primevue/dialog'
import InputText   from 'primevue/inputtext'
import Select      from 'primevue/select'
import DatePicker  from 'primevue/datepicker'
import ConfirmDialog from 'primevue/confirmdialog'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'

interface Manager {
  id: string
  name: string
  role: string
  email: string
  auth_id: string
  store_name: string
  start_date: string
}

interface Store {
  id: string
  name: string
}

const ui      = useUiStore()
const confirm = useConfirm()

const managers      = ref<Manager[]>([])
const loading       = ref(true)
const error         = ref('')
const storeOptions  = ref<{ label: string; value: string }[]>([])
const storesLoading = ref(false)

const dialogVisible = ref(false)
const saving        = ref(false)
const form = ref({
  name: '',
  store_id: '',
  start_date: null as Date | null,
  email: '',
})

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get<{ data: Manager[] }>('/api/v1/admin/managers?per_page=200')
    managers.value = data.data ?? []
  } catch {
    error.value = 'Failed to load managers.'
  } finally {
    loading.value = false
  }
}

async function loadStores() {
  storesLoading.value = true
  try {
    const { data } = await api.get<{ data: Store[] }>('/api/v1/admin/stores?per_page=200')
    storeOptions.value = (data.data ?? []).map((s) => ({ label: s.name, value: s.id }))
  } finally {
    storesLoading.value = false
  }
}

onMounted(() => {
  load()
  loadStores()
})

function openNew() {
  form.value = { name: '', store_id: '', start_date: null, email: '' }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name.trim() || !form.value.store_id || !form.value.start_date) {
    ui.showToast('warn', 'Name, store, and start date are required')
    return
  }
  saving.value = true
  try {
    const { data } = await api.post<{ claim_token?: string; auth_id?: string }>('/api/v1/admin/managers', {
      name: form.value.name,
      store_id: form.value.store_id,
      start_date: (form.value.start_date as Date).toISOString(),
      email: form.value.email,
    })

    if (form.value.email && !data.claim_token) {
      // Socrate invite sent successfully
      ui.showToast('success', `Invite sent to ${form.value.email}`)
    } else if (data.claim_token) {
      // Either no email was provided, or Socrate degraded gracefully to a link
      const link = `${window.location.origin}/claim/${data.claim_token}`
      await navigator.clipboard.writeText(link)
      const msg = form.value.email
        ? `Email invite unavailable — invite link copied to clipboard`
        : `Invite link copied to clipboard`
      ui.showToast('info', msg)
    } else {
      ui.showToast('success', 'Manager created')
    }

    dialogVisible.value = false
    await load()
  } catch {
    ui.showToast('error', 'Failed to invite manager')
  } finally {
    saving.value = false
  }
}

async function resendInvite(m: Manager) {
  try {
    const { data } = await api.post<{ email_sent: boolean; claim_token?: string }>(
      `/api/v1/admin/managers/${m.id}/resend-invite`
    )
    if (data.email_sent) {
      ui.showToast('success', `Invite resent to ${m.email}`)
    } else if (data.claim_token) {
      const link = `${window.location.origin}/claim/${data.claim_token}`
      await navigator.clipboard.writeText(link)
      ui.showToast('info', 'Email unavailable — new invite link copied to clipboard')
    } else {
      ui.showToast('warn', 'Invite may not have been delivered')
    }
    await load()
  } catch {
    ui.showToast('error', 'Failed to resend invite')
  }
}

function confirmDelete(m: Manager) {
  confirm.require({
    message: `Remove manager "${m.name}"? Their employee record will be deleted.`,
    header: 'Remove manager',
    icon: 'pi pi-exclamation-triangle',
    acceptSeverity: 'danger',
    accept: () => deleteManager(m),
  })
}

async function deleteManager(m: Manager) {
  try {
    await api.delete(`/api/v1/admin/managers/${m.id}`)
    ui.showToast('success', 'Manager removed')
    await load()
  } catch {
    ui.showToast('error', 'Failed to remove manager')
  }
}
</script>

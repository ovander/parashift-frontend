<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">{{ t('admin.managers.title') }}</h1>
      <Button :label="t('admin.managers.inviteManager')" icon="pi pi-user-plus" @click="openNew" />
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
    >
      <i class="pi pi-exclamation-triangle text-red-500" />
      {{ error }}
      <Button :label="t('common.retry')" text size="small" class="ml-auto" @click="load" />
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
          <Column field="name" :header="t('common.name')" sortable />
          <!-- hidden on mobile -->
          <Column v-if="!isMobile" field="store_name" :header="t('admin.managers.colStore')" style="width: 200px">
            <template #body="{ data }">
              <span class="text-sm text-gray-600">{{ data.store_name || '—' }}</span>
            </template>
          </Column>
          <Column :header="t('common.status')" style="width: 150px">
            <template #body="{ data }">
              <span
                v-if="data.auth_id"
                class="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200"
              >
                <i class="pi pi-check-circle text-[10px]" /> {{ t('admin.managers.statusActive') }}
              </span>
              <span
                v-else-if="data.email"
                class="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
              >
                <i class="pi pi-envelope text-[10px]" /> {{ t('admin.managers.statusInviteSent') }}
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200"
              >
                <i class="pi pi-link text-[10px]" /> {{ t('admin.managers.statusLinkPending') }}
              </span>
            </template>
          </Column>
          <!-- desktop only -->
          <Column v-if="isDesktop" field="email" :header="t('common.email')" style="width: 220px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ data.email || '—' }}</span>
            </template>
          </Column>
          <!-- desktop only -->
          <Column v-if="isDesktop" field="start_date" :header="t('common.startDate')" style="width: 110px" />
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
                  v-tooltip.top="t('admin.managers.resendInviteTooltip')"
                  @click="resendInvite(data)"
                />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" />
              </div>
            </template>
          </Column>
          <template #empty>
            <span class="text-sm text-gray-400">{{ t('admin.managers.empty') }}</span>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Invite dialog -->
    <ResponsiveDialog
      v-model:visible="dialogVisible"
      :header="t('admin.managers.inviteManager')"
      size="sm"
    >
      <div class="space-y-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">{{ t('common.fullName') }} <span class="text-red-500">*</span></label>
          <InputText v-model="form.name" placeholder="e.g. Sophie Martin" autofocus />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">{{ t('common.store') }} <span class="text-red-500">*</span></label>
          <Select
            v-model="form.store_id"
            :options="storeOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('admin.managers.selectStore')"
            :loading="storesLoading"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">{{ t('common.startDate') }} <span class="text-red-500">*</span></label>
          <DatePicker v-model="form.start_date" date-format="yy-mm-dd" placeholder="YYYY-MM-DD" show-icon />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">{{ t('admin.managers.emailSendsInvite') }}</label>
          <InputText v-model="form.email" type="email" placeholder="manager@pharmacy.be" />
          <p class="text-xs text-gray-400">{{ t('admin.managers.emailHint') }}</p>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="form.email ? t('admin.managers.sendInvite') : t('admin.managers.generateLink')" :loading="saving" @click="save" />
      </template>
    </ResponsiveDialog>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Button      from 'primevue/button'
import Card        from 'primevue/card'
import DataTable   from 'primevue/datatable'
import Column      from 'primevue/column'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import InputText   from 'primevue/inputtext'
import Select      from 'primevue/select'
import DatePicker  from 'primevue/datepicker'
import ConfirmDialog from 'primevue/confirmdialog'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'

const { isMobile, isDesktop } = useBreakpoint()

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

const { t }   = useI18n()
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
    error.value = t('admin.managers.loadFailed')
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
})

function openNew() {
  form.value = { name: '', store_id: '', start_date: null, email: '' }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name.trim() || !form.value.store_id || !form.value.start_date) {
    ui.showToast('warn', t('admin.managers.formInvalid'))
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
      ui.showToast('success', t('admin.managers.inviteSent', { email: form.value.email }))
    } else if (data.claim_token) {
      // Either no email was provided, or Socrate degraded gracefully to a link
      const link = `${window.location.origin}/claim/${data.claim_token}`
      await navigator.clipboard.writeText(link)
      const msg = form.value.email
        ? t('admin.managers.emailUnavailable')
        : t('admin.managers.linkCopied')
      ui.showToast('info', msg)
    } else {
      ui.showToast('success', t('admin.managers.created'))
    }

    dialogVisible.value = false
    await load()
  } catch {
    ui.showToast('error', t('admin.managers.inviteFailed'))
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
      ui.showToast('success', t('admin.managers.resendSent', { email: m.email }))
    } else if (data.claim_token) {
      const link = `${window.location.origin}/claim/${data.claim_token}`
      await navigator.clipboard.writeText(link)
      ui.showToast('info', t('admin.managers.resendLinkCopied'))
    } else {
      ui.showToast('warn', t('admin.managers.resendMayFail'))
    }
    await load()
  } catch {
    ui.showToast('error', t('admin.managers.resendFailed'))
  }
}

function confirmDelete(m: Manager) {
  confirm.require({
    message: t('admin.managers.removeMessage', { name: m.name }),
    header:  t('admin.managers.removeHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteManager(m),
  })
}

async function deleteManager(m: Manager) {
  try {
    await api.delete(`/api/v1/admin/managers/${m.id}`)
    ui.showToast('success', t('admin.managers.removed'))
    await load()
  } catch {
    ui.showToast('error', t('admin.managers.removeFailed'))
  }
}
</script>

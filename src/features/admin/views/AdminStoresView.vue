<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Stores</h1>
      <Button label="New store" icon="pi pi-plus" @click="openNew" />
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
          :value="stores"
          :loading="loading"
          size="small"
          :rows="20"
          paginator
          :rows-per-page-options="[10, 20, 50]"
        >
          <Column field="name" header="Name" sortable />
          <Column field="timezone" header="Timezone" style="width: 180px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ data.timezone || '—' }}</span>
            </template>
          </Column>
          <Column field="created_at" header="Created" style="width: 140px">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
          <Column header="" style="width: 100px">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(data)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" />
              </div>
            </template>
          </Column>
          <template #empty>
            <span class="text-sm text-gray-400">No stores yet.</span>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create / Edit dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editingStore ? 'Edit store' : 'New store'"
      :style="{ width: '420px' }"
      modal
    >
      <div class="space-y-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Store name <span class="text-red-500">*</span></label>
          <InputText v-model="form.name" placeholder="e.g. Brussels Central" autofocus />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Timezone</label>
          <Select
            v-model="form.timezone"
            :options="timezones"
            option-label="label"
            option-value="value"
            placeholder="Select a timezone"
            filter
            fluid
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button :label="editingStore ? 'Save' : 'Create'" :loading="saving" @click="save" />
      </template>
    </Dialog>

    <!-- Delete confirm -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import Button        from 'primevue/button'
import Card          from 'primevue/card'
import DataTable     from 'primevue/datatable'
import Column        from 'primevue/column'
import Dialog        from 'primevue/dialog'
import InputText     from 'primevue/inputtext'
import Select        from 'primevue/select'
import ConfirmDialog from 'primevue/confirmdialog'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'

interface Store {
  id:         string
  name:       string
  timezone:   string
  created_at: string
}

const ui      = useUiStore()
const confirm = useConfirm()

const stores  = ref<Store[]>([])
const loading = ref(true)
const error   = ref('')

const dialogVisible = ref(false)
const editingStore  = ref<Store | null>(null)
const saving        = ref(false)
const form = ref({ name: '', timezone: 'Europe/Brussels' })

// Common timezones — enough for a pharmacy chain context.
const timezones = [
  { label: 'Europe/Brussels (UTC+1/+2)',   value: 'Europe/Brussels'   },
  { label: 'Europe/Paris (UTC+1/+2)',      value: 'Europe/Paris'      },
  { label: 'Europe/Amsterdam (UTC+1/+2)',  value: 'Europe/Amsterdam'  },
  { label: 'Europe/London (UTC+0/+1)',     value: 'Europe/London'     },
  { label: 'Europe/Berlin (UTC+1/+2)',     value: 'Europe/Berlin'     },
  { label: 'Europe/Madrid (UTC+1/+2)',     value: 'Europe/Madrid'     },
  { label: 'Europe/Rome (UTC+1/+2)',       value: 'Europe/Rome'       },
  { label: 'Europe/Lisbon (UTC+0/+1)',     value: 'Europe/Lisbon'     },
  { label: 'Europe/Zurich (UTC+1/+2)',     value: 'Europe/Zurich'     },
  { label: 'UTC',                          value: 'UTC'               },
]

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get<{ data: Store[] }>('/api/v1/admin/stores?per_page=200')
    stores.value = data.data ?? []
  } catch {
    error.value = 'Failed to load stores.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openNew() {
  editingStore.value = null
  form.value = { name: '', timezone: 'Europe/Brussels' }
  dialogVisible.value = true
}

function openEdit(store: Store) {
  editingStore.value = store
  form.value = { name: store.name, timezone: store.timezone || 'Europe/Brussels' }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    if (editingStore.value) {
      await api.put(`/api/v1/admin/stores/${editingStore.value.id}`, {
        name:     form.value.name,
        timezone: form.value.timezone,
      })
      ui.showToast('success', 'Store updated')
    } else {
      await api.post('/api/v1/admin/stores', {
        name:     form.value.name,
        timezone: form.value.timezone,
      })
      ui.showToast('success', 'Store created')
    }
    dialogVisible.value = false
    await load()
  } catch {
    ui.showToast('error', 'Failed to save store')
  } finally {
    saving.value = false
  }
}

function confirmDelete(store: Store) {
  confirm.require({
    message: `Delete store "${store.name}"? This action cannot be undone.`,
    header: 'Delete store',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteStore(store),
  })
}

async function deleteStore(store: Store) {
  try {
    await api.delete(`/api/v1/admin/stores/${store.id}`)
    ui.showToast('success', 'Store deleted')
    await load()
  } catch {
    ui.showToast('error', 'Failed to delete store')
  }
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}
</script>

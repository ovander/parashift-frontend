<template>
  <div class="p-6 space-y-6">
    <h1 class="text-xl font-semibold text-gray-900">Admin Dashboard</h1>

    <!-- Loading skeletons -->
    <template v-if="loading">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="n in 3" :key="n" class="h-24 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div v-for="n in 5" :key="n" class="h-24 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="n in 3" :key="n" class="h-24 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="n in 2" :key="n" class="h-48 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    </template>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
    >
      <i class="pi pi-exclamation-triangle text-red-500" />
      {{ error }}
      <Button label="Retry" text size="small" class="ml-auto" @click="load" />
    </div>

    <template v-else-if="data">
      <!-- ── Section 1: Organisation ──────────────────────────────────── -->
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Organisation</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            label="Total stores"
            :value="data.organization.totalStores"
            icon="pi-building"
            color="blue"
          />
          <KpiCard
            label="Active stores"
            :value="data.organization.activeStores"
            icon="pi-check-circle"
            color="green"
            hint="Stores with at least one active employee"
          />
          <KpiCard
            label="Inactive stores"
            :value="data.organization.inactiveStores"
            icon="pi-minus-circle"
            color="gray"
            hint="Stores with no active employees yet"
          />
        </div>
      </section>

      <!-- ── Section 2: Users & Onboarding ───────────────────────────── -->
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Users &amp; Onboarding</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Total employees"
            :value="data.users.totalEmployees"
            icon="pi-users"
            color="blue"
          />
          <KpiCard
            label="Managers"
            :value="data.users.totalManagers"
            icon="pi-user-edit"
            color="blue"
            :clickable="true"
            hint="Employees with the manager role"
            @click="navigate('/admin/managers')"
          />
          <KpiCard
            label="Active employees"
            :value="data.users.activeEmployees"
            icon="pi-user-check"
            color="green"
            hint="Employees with a bound Socrate account"
          />
          <KpiCard
            label="Pending invites"
            :value="data.users.pendingInvites"
            icon="pi-envelope"
            color="amber"
            :clickable="true"
            hint="Invited by email, not yet logged in"
            @click="navigate('/admin/employees?status=pending')"
          />
          <KpiCard
            label="Unclaimed links"
            :value="data.users.unclaimed"
            icon="pi-link"
            color="orange"
            :clickable="true"
            hint="Manual invite link generated, not yet used"
            @click="navigate('/admin/employees?status=unclaimed')"
          />
        </div>
      </section>

      <!-- ── Section 3: Data Integrity ───────────────────────────────── -->
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Data Integrity</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            label="Employees without store"
            :value="data.integrity.noStore"
            icon="pi-building"
            :color="data.integrity.noStore > 0 ? 'red' : 'gray'"
            :clickable="data.integrity.noStore > 0"
            hint="Orphaned records — their store was soft-deleted"
            @click="navigate('/admin/employees?filter=noStore')"
          />
          <KpiCard
            label="Employees without role"
            :value="data.integrity.noRole"
            icon="pi-shield"
            :color="data.integrity.noRole > 0 ? 'red' : 'gray'"
            :clickable="data.integrity.noRole > 0"
            hint="Employees with an empty role field"
            @click="navigate('/admin/employees?filter=noRole')"
          />
          <KpiCard
            label="Expired invite links"
            :value="data.integrity.expiredTokens"
            icon="pi-clock"
            :color="data.integrity.expiredTokens > 0 ? 'amber' : 'gray'"
            :clickable="data.integrity.expiredTokens > 0"
            hint="Unclaimed invite links older than 7 days"
            @click="navigate('/admin/employees?filter=expiredTokens')"
          />
        </div>
      </section>

      <!-- ── Section 4: Recent Activity ──────────────────────────────── -->
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent Activity</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- Recent stores -->
          <Card>
            <template #header>
              <div class="px-5 pt-4 flex items-center gap-2">
                <i class="pi pi-building text-gray-400 text-sm" />
                <span class="text-sm font-semibold text-gray-700">Recently created stores</span>
              </div>
            </template>
            <template #content>
              <DataTable :value="data.activity.recentStores" size="small" :show-gridlines="false">
                <Column field="name" header="Store" />
                <Column header="Created" style="width: 140px">
                  <template #body="{ data: row }">
                    <span class="text-xs text-gray-500">{{ formatDate(row.createdAt) }}</span>
                  </template>
                </Column>
                <template #empty>
                  <span class="text-sm text-gray-400">No stores yet.</span>
                </template>
              </DataTable>
            </template>
          </Card>

          <!-- Recent invites -->
          <Card>
            <template #header>
              <div class="px-5 pt-4 flex items-center gap-2">
                <i class="pi pi-envelope text-gray-400 text-sm" />
                <span class="text-sm font-semibold text-gray-700">Recently invited employees</span>
              </div>
            </template>
            <template #content>
              <DataTable :value="data.activity.recentInvites" size="small" :show-gridlines="false">
                <Column field="email" header="Email" />
                <Column header="Invited" style="width: 140px">
                  <template #body="{ data: row }">
                    <span class="text-xs text-gray-500">{{ formatDate(row.createdAt) }}</span>
                  </template>
                </Column>
                <template #empty>
                  <span class="text-sm text-gray-400">No invites sent yet.</span>
                </template>
              </DataTable>
            </template>
          </Card>

        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import Button    from 'primevue/button'
import Card      from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import api from '@/composables/useApi'
import { useUiStore } from '@/stores/ui'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Dashboard {
  organization: { totalStores: number; activeStores: number; inactiveStores: number }
  users:        { totalEmployees: number; totalManagers: number; activeEmployees: number; pendingInvites: number; unclaimed: number }
  integrity:    { noStore: number; noRole: number; expiredTokens: number }
  activity: {
    recentStores:  { id: string; name: string; createdAt: string }[]
    recentInvites: { employeeId: string; email: string; createdAt: string }[]
  }
}

// ── State ──────────────────────────────────────────────────────────────────────
const router = useRouter()
const ui     = useUiStore()

const data    = ref<Dashboard | null>(null)
const loading = ref(true)
const error   = ref('')

// ── Data fetching ──────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value   = ''
  try {
    const { data: resp } = await api.get<Dashboard>('/api/v1/admin/dashboard')
    data.value = resp
  } catch {
    error.value = 'Failed to load dashboard. Please try again.'
    ui.showToast('error', 'Dashboard load failed')
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Helpers ────────────────────────────────────────────────────────────────────
function navigate(path: string) {
  router.push(path)
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

// ── KpiCard — inline render-function component ─────────────────────────────────
// Using h() directly avoids the runtime template compiler warning (Vite uses the
// runtime-only Vue build). Color and clickability are fully prop-driven — no
// business logic is hardcoded in this component.

type ColorKey = 'blue' | 'green' | 'amber' | 'orange' | 'red' | 'gray'

const colorMap: Record<ColorKey, { bg: string; text: string; icon: string; ring: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-400',   ring: 'hover:ring-blue-200'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-400',  ring: 'hover:ring-green-200'  },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-400',  ring: 'hover:ring-amber-200'  },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-400', ring: 'hover:ring-orange-200' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-400',    ring: 'hover:ring-red-200'    },
  gray:   { bg: 'bg-gray-50',   text: 'text-gray-500',   icon: 'text-gray-300',   ring: ''                      },
}

const KpiCard = {
  props: {
    label:     { type: String,  required: true },
    value:     { type: Number,  required: true },
    icon:      { type: String,  required: true },
    color:     { type: String,  default: 'blue' },
    hint:      { type: String,  default: '' },
    clickable: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props: any, { emit }: any) {
    return () => {
      const c      = colorMap[props.color as ColorKey] ?? colorMap.blue
      const active = props.clickable && props.value > 0
      return h('div', {
        class: [
          'rounded-xl border p-4 flex flex-col gap-2 transition-all select-none',
          c.bg,
          active ? `cursor-pointer ring-2 ring-transparent ${c.ring} hover:shadow-md` : 'cursor-default',
        ],
        title:   props.hint || undefined,
        onClick: active ? () => emit('click') : undefined,
      }, [
        // Label row
        h('div', { class: 'flex items-center justify-between' }, [
          h('span', { class: `text-sm font-medium ${c.text}` }, props.label),
          h('i',    { class: `pi ${props.icon} text-lg ${c.icon}` }),
        ]),
        // Value row
        h('div', { class: 'flex items-end justify-between' }, [
          h('span', { class: `text-3xl font-bold tabular-nums ${c.text}` }, String(props.value)),
          active
            ? h('span', { class: `text-xs ${c.text} opacity-60 flex items-center gap-1` }, [
                'View ',
                h('i', { class: 'pi pi-arrow-right text-[10px]' }),
              ])
            : null,
        ]),
      ])
    }
  },
}
</script>

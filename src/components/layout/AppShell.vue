<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">
    <!-- Sidebar -->
    <!-- Sidebar: hidden on mobile, visible as flex column on md+ -->
    <nav
      class="flex-shrink-0 bg-white border-r border-gray-200 hidden md:flex md:flex-col transition-all duration-200"
      :class="collapsed ? 'w-14' : 'w-56'"
    >
      <!-- Logo + collapse toggle -->
      <div class="flex items-center border-b border-gray-200" :class="collapsed ? 'justify-center p-2' : 'px-4 py-3 gap-2'">
        <RouterLink v-if="!collapsed" to="/" class="flex-1 min-w-0">
          <img src="/logo.png" alt="ParaShift" class="h-7 w-auto" />
        </RouterLink>
        <button
          class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          :title="collapsed ? 'Expand navigation' : 'Collapse navigation'"
          @click="collapsed = !collapsed"
        >
          <i class="pi text-sm" :class="collapsed ? 'pi-chevron-right' : 'pi-chevron-left'" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto py-3" :class="collapsed ? 'px-1.5' : 'px-2'">
        <!-- Manager nav — use authStore.user directly to avoid ComputedRef truthy-object trap -->
        <template v-if="authStore.user?.position === 'manager' && ctx.storeId">
          <NavSection v-if="!collapsed" label="Schedule" />
          <div v-else class="border-b border-gray-100 mb-1.5 pb-1.5" />
          <NavItem :to="`/stores/${ctx.storeId}/planner`"       icon="pi-calendar"       :label="t('nav.planner')"  :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/coverage`"      icon="pi-chart-bar"      :label="t('nav.coverage')" :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/leave/approve`" icon="pi-calendar-minus" :label="t('nav.leave')"    :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/swaps/approve`" icon="pi-arrows-h"       :label="t('nav.swaps')"   :collapsed="collapsed" />

          <template v-if="!collapsed">
            <NavSection label="Configuration" />
          </template>
          <div v-else class="border-b border-gray-100 my-1.5" />
          <NavItem :to="`/stores/${ctx.storeId}/team`"   icon="pi-users"    label="Team"   :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/rules`"  icon="pi-shield"   :label="t('nav.rules')" :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/config`" icon="pi-building" :label="t('nav.config')" :collapsed="collapsed" />
        </template>

        <!-- Employee nav -->
        <template v-if="authStore.user?.position === 'employee'">
          <NavSection v-if="!collapsed" label="My Schedule" />
          <div v-else class="border-b border-gray-100 mb-1.5 pb-1.5" />
          <NavItem :to="`/stores/${ctx.storeId}/today`"   icon="pi-home"           label="Today"              :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/my-week`" icon="pi-calendar-clock" :label="t('nav.myWeek')"  :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/leave`"   icon="pi-calendar-minus" :label="t('nav.leave')"   :collapsed="collapsed" />
        </template>

        <!-- Admin nav -->
        <template v-if="authStore.user?.position === 'admin'">
          <NavSection v-if="!collapsed" label="Operations" />
          <NavItem to="/admin"            icon="pi-objects-column" label="Dashboard"  :collapsed="collapsed" />
          <NavItem to="/admin/audit-logs" icon="pi-list"           label="Audit Logs" :collapsed="collapsed" />
          <NavSection v-if="!collapsed" label="Organisation" />
          <NavItem to="/admin/stores"    icon="pi-building"  label="Stores"    :collapsed="collapsed" />
          <NavItem to="/admin/managers"  icon="pi-user-edit" label="Managers"  :collapsed="collapsed" />
          <NavItem to="/admin/employees" icon="pi-users"     label="Employees" :collapsed="collapsed" />
        </template>
      </div>

      <!-- User footer -->
      <div class="border-t border-gray-200" :class="collapsed ? 'p-1.5' : 'p-3'">
        <div v-if="!collapsed" class="flex items-center gap-2 px-2">
          <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
            {{ initials }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-gray-800 truncate">{{ authStore.user?.name }}</div>
            <div class="text-xs text-gray-400 capitalize">{{ authStore.user?.position }}</div>
          </div>
          <Button icon="pi pi-sign-out" text rounded size="small" @click="logout" v-tooltip="t('auth.logout')" />
        </div>
        <div v-else class="flex justify-center">
          <button
            class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold hover:bg-brand-200 transition-colors"
            :title="authStore.user?.name"
            @click="logout"
          >
            {{ initials }}
          </button>
        </div>
      </div>
    </nav>

    <!-- Main content — flex-col + h-full lets child views fill exactly the available space -->
    <main class="flex-1 flex flex-col overflow-hidden min-w-0">
      <ErrorBoundary>
        <RouterView />
      </ErrorBoundary>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, resolveComponent, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/stores/storeContext'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const { t }     = useI18n()
const auth      = useAuth()
const authStore = useAuthStore()
const ctx       = useStoreContext()
const route     = useRoute()
const router    = useRouter()

// ── Sidebar collapse state (persisted in localStorage) ─────────────────
const collapsed = ref(localStorage.getItem('nav:collapsed') === 'true')
watch(collapsed, (v) => localStorage.setItem('nav:collapsed', String(v)))

// Sync the storeId URL param into storeContext so sidebar nav links are always valid.
// Falls back to auth.user.store_id when on routes without a :storeId param (e.g. /admin).
watch(
  () => (route.params.storeId as string) || authStore.user?.store_id,
  (id) => { if (id) ctx.setStore(id) },
  { immediate: true },
)

const initials = computed(() => {
  const name = authStore.user?.name ?? ''
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
})

async function logout() {
  await auth.logout()
  router.push('/login')
}

// NavItem — supports collapsed (icon-only) mode with a tooltip fallback.
const NavItem = {
  props: ['to', 'icon', 'label', 'collapsed'],
  setup(props) {
    return () => {
      if (props.collapsed) {
        // Icon-only: render a centered icon with title tooltip
        return h(
          resolveComponent('RouterLink'),
          {
            to: props.to,
            title: props.label,
            class:
              'flex items-center justify-center w-9 h-9 mx-auto mb-0.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors [&.router-link-active]:bg-brand-50 [&.router-link-active]:text-brand-700',
          },
          () => h('i', { class: ['pi', props.icon, 'text-base'] }),
        )
      }
      return h(
        resolveComponent('RouterLink'),
        {
          to: props.to,
          class:
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors [&.router-link-active]:bg-brand-50 [&.router-link-active]:text-brand-700 [&.router-link-active]:font-medium',
        },
        () => [h('i', { class: ['pi', props.icon, 'text-base'] }), ' ' + props.label],
      )
    }
  },
}

// NavSection renders a labeled group header (hidden in collapsed mode).
const NavSection = {
  props: ['label'],
  setup(props, { slots }) {
    return () =>
      h('div', { class: 'mb-3' }, [
        h('p', { class: 'px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400' }, props.label),
        h('div', { class: 'space-y-0.5' }, slots.default?.()),
      ])
  },
}
</script>

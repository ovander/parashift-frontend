<template>
  <div class="flex h-dvh bg-gray-50 overflow-hidden">
    <!-- Sidebar -->
    <!--
      Managers/admins: sidebar from md+ (768px).
      Employees: sidebar only from lg+ (1024px) — below that they use the bottom nav.
    -->
    <nav
      class="flex-shrink-0 bg-white border-r border-gray-200 flex-col transition-all duration-200"
      :class="[
        authStore.user?.position === 'employee' ? 'hidden lg:flex' : 'hidden md:flex',
        collapsed ? 'w-14' : 'w-56',
      ]"
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
          <NavSection v-if="!collapsed" :label="t('nav.schedule')" />
          <div v-else class="border-b border-gray-100 mb-1.5 pb-1.5" />
          <NavItem :to="`/stores/${ctx.storeId}/planner`"       icon="pi-calendar"       :label="t('nav.planner')"  :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/coverage`"      icon="pi-chart-bar"      :label="t('nav.coverage')" :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/leave/approve`" icon="pi-calendar-minus" :label="t('nav.leave')"    :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/swaps/approve`" icon="pi-arrows-h"       :label="t('nav.swaps')"   :collapsed="collapsed" />

          <template v-if="!collapsed">
            <NavSection :label="t('nav.configuration')" />
          </template>
          <div v-else class="border-b border-gray-100 my-1.5" />
          <NavItem :to="`/stores/${ctx.storeId}/team`"   icon="pi-users"    :label="t('nav.team')"   :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/rules`"  icon="pi-shield"   :label="t('nav.rules')" :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/config`" icon="pi-building" :label="t('nav.config')" :collapsed="collapsed" />
        </template>

        <!-- Employee nav -->
        <template v-if="authStore.user?.position === 'employee'">
          <NavSection v-if="!collapsed" :label="t('nav.mySchedule')" />
          <div v-else class="border-b border-gray-100 mb-1.5 pb-1.5" />
          <NavItem :to="`/stores/${ctx.storeId}/today`"   icon="pi-home"           :label="t('schedule.today')"  :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/my-week`" icon="pi-calendar-clock" :label="t('nav.myWeek')"  :collapsed="collapsed" />
          <NavItem :to="`/stores/${ctx.storeId}/leave`"   icon="pi-calendar-minus" :label="t('nav.leave')"   :collapsed="collapsed" />
        </template>

        <!-- Admin nav -->
        <template v-if="authStore.user?.position === 'admin'">
          <NavSection v-if="!collapsed" :label="t('nav.operations')" />
          <NavItem to="/admin"            icon="pi-objects-column" :label="t('nav.dashboard')"  :collapsed="collapsed" />
          <NavItem to="/admin/audit-logs" icon="pi-list"           :label="t('nav.auditLogs')"  :collapsed="collapsed" />
          <NavSection v-if="!collapsed" :label="t('nav.organisation')" />
          <NavItem to="/admin/stores"    icon="pi-building"  :label="t('nav.stores')"    :collapsed="collapsed" />
          <NavItem to="/admin/managers"  icon="pi-user-edit" :label="t('nav.managers')"  :collapsed="collapsed" />
          <NavItem to="/admin/employees" icon="pi-users"     :label="t('nav.employees')" :collapsed="collapsed" />
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
          <!-- Sprint 1 T1.3: Language switcher -->
          <div class="flex items-center gap-0.5 mr-0.5">
            <button
              v-for="lang in SUPPORTED_LOCALES"
              :key="lang"
              class="text-xs px-1 py-0.5 rounded transition-colors leading-none"
              :class="locale === lang
                ? 'bg-brand-100 text-brand-700 font-semibold'
                : 'text-gray-400 hover:text-gray-600'"
              :data-testid="`lang-${lang}`"
              :title="lang === 'fr' ? 'Français' : 'English'"
              @click="setLocale(lang)"
            >{{ lang === 'fr' ? '🇫🇷' : '🇬🇧' }}</button>
          </div>
          <Button icon="pi pi-sign-out" text rounded size="small" data-test="logout" :aria-label="t('auth.logout')" @click="logout" v-tooltip="t('auth.logout')" />
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

        <!-- Version chip -->
        <button
          v-if="!collapsed"
          class="mt-2 w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-50 transition-colors group"
          @click="aboutOpen = true"
        >
          <i class="pi pi-info-circle text-[11px] text-gray-300 group-hover:text-gray-400" />
          <span class="text-[10px] text-gray-300 group-hover:text-gray-400 font-mono truncate">
            v{{ appVersion.frontend.version }} · {{ appVersion.frontend.commit }}
          </span>
        </button>
        <div v-else class="flex justify-center mt-1.5">
          <button
            class="text-gray-300 hover:text-gray-400 transition-colors"
            :title="t('common.about.title')"
            @click="aboutOpen = true"
          >
            <i class="pi pi-info-circle text-xs" />
          </button>
        </div>
      </div>
    </nav>

    <!-- ── About dialog ──────────────────────────────────────────────────────── -->
    <ResponsiveDialog v-model:visible="aboutOpen" :header="t('common.about.title')" size="sm" :draggable="false">
      <div class="space-y-4 text-sm">
        <!-- Frontend -->
        <div>
          <div class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{{ t('common.about.frontend') }}</div>
          <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-gray-700">
            <span class="text-gray-400">{{ t('common.about.version') }}</span>
            <span class="font-mono">{{ appVersion.frontend.version }}</span>
            <span class="text-gray-400">{{ t('common.about.commit') }}</span>
            <span class="font-mono">{{ appVersion.frontend.commit }}</span>
            <span class="text-gray-400">{{ t('common.about.build') }}</span>
            <span class="font-mono text-xs">{{ appVersion.frontend.buildTime }}</span>
          </div>
        </div>

        <div class="border-t border-gray-100" />

        <!-- Backend -->
        <div>
          <div class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{{ t('common.about.backend') }}</div>
          <div v-if="appVersion.backend" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-gray-700">
            <span class="text-gray-400">{{ t('common.about.version') }}</span>
            <span class="font-mono">{{ appVersion.backend.version }}</span>
            <span class="text-gray-400">{{ t('common.about.commit') }}</span>
            <span class="font-mono">{{ appVersion.backend.commit }}</span>
            <span class="text-gray-400">{{ t('common.about.build') }}</span>
            <span class="font-mono text-xs">{{ appVersion.backend.build_time }}</span>
          </div>
          <div v-else class="text-xs text-gray-400 italic">{{ t('common.about.loading') }}</div>
        </div>
      </div>
    </ResponsiveDialog>

    <!-- Main content — flex-col + h-full lets child views fill exactly the available space -->
    <!-- pb-16 lg:pb-0 (employees): leave room for the bottom nav on phone + tablet -->
    <main
      class="flex-1 flex flex-col overflow-hidden min-w-0"
      :class="authStore.user?.position === 'employee' ? 'pb-16 lg:pb-0' : ''"
    >
      <!-- ── Mobile top bar — managers/admins only, hidden on md+ ──────────── -->
      <header
        v-if="authStore.user?.position !== 'employee'"
        class="md:hidden flex-shrink-0 flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 z-40"
      >
        <button
          class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Open menu"
          @click="mobileMenuOpen = true"
        >
          <i class="pi pi-bars text-lg" />
        </button>
        <RouterLink to="/" class="flex-1 min-w-0">
          <img src="/logo.png" alt="ParaShift" class="h-6 w-auto" />
        </RouterLink>
        <div
          class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold"
          :title="authStore.user?.name"
        >
          {{ initials }}
        </div>
      </header>

      <ErrorBoundary>
        <RouterView />
      </ErrorBoundary>
    </main>

    <!-- ── Mobile nav drawer — managers/admins on < md ───────────────────── -->
    <Drawer
      v-if="authStore.user?.position !== 'employee'"
      v-model:visible="mobileMenuOpen"
      position="left"
      :style="{ width: '14rem' }"
      :pt="{ header: { style: 'padding: 0.75rem 1rem' }, content: { style: 'padding: 0.75rem 0.5rem' } }"
      class="md:!hidden"
    >
      <template #header>
        <img src="/logo.png" alt="ParaShift" class="h-6 w-auto" />
      </template>

      <div class="space-y-0.5" @click="mobileMenuOpen = false">
        <template v-if="authStore.user?.position === 'manager' && ctx.storeId">
          <p class="px-3 mb-1 mt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{{ t('nav.schedule') }}</p>
          <NavItem :to="`/stores/${ctx.storeId}/planner`"       icon="pi-calendar"       :label="t('nav.planner')"  :collapsed="false" />
          <NavItem :to="`/stores/${ctx.storeId}/coverage`"      icon="pi-chart-bar"      :label="t('nav.coverage')" :collapsed="false" />
          <NavItem :to="`/stores/${ctx.storeId}/leave/approve`" icon="pi-calendar-minus" :label="t('nav.leave')"    :collapsed="false" />
          <NavItem :to="`/stores/${ctx.storeId}/swaps/approve`" icon="pi-arrows-h"       :label="t('nav.swaps')"    :collapsed="false" />
          <p class="px-3 mb-1 mt-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{{ t('nav.configuration') }}</p>
          <NavItem :to="`/stores/${ctx.storeId}/team`"   icon="pi-users"    :label="t('nav.team')"         :collapsed="false" />
          <NavItem :to="`/stores/${ctx.storeId}/rules`"  icon="pi-shield"   :label="t('nav.rules')"        :collapsed="false" />
          <NavItem :to="`/stores/${ctx.storeId}/config`" icon="pi-building" :label="t('nav.config')"       :collapsed="false" />
        </template>

        <template v-if="authStore.user?.position === 'admin'">
          <p class="px-3 mb-1 mt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{{ t('nav.operations') }}</p>
          <NavItem to="/admin"            icon="pi-objects-column" :label="t('nav.dashboard')"  :collapsed="false" />
          <NavItem to="/admin/audit-logs" icon="pi-list"           :label="t('nav.auditLogs')"  :collapsed="false" />
          <p class="px-3 mb-1 mt-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{{ t('nav.organisation') }}</p>
          <NavItem to="/admin/stores"    icon="pi-building"  :label="t('nav.stores')"    :collapsed="false" />
          <NavItem to="/admin/managers"  icon="pi-user-edit" :label="t('nav.managers')"  :collapsed="false" />
          <NavItem to="/admin/employees" icon="pi-users"     :label="t('nav.employees')" :collapsed="false" />
        </template>
      </div>

      <template #footer>
        <div class="flex items-center gap-2 px-1">
          <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
            {{ initials }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-gray-800 truncate">{{ authStore.user?.name }}</div>
            <div class="text-xs text-gray-400 capitalize">{{ authStore.user?.position }}</div>
          </div>
          <Button icon="pi pi-sign-out" text rounded size="small" data-test="logout" :aria-label="t('auth.logout')" @click="logout" v-tooltip="t('auth.logout')" />
        </div>
      </template>
    </Drawer>
  </div>

  <!-- ── Bottom nav — employees on phone + tablet (< lg = < 1024px) ──────── -->
  <nav
    v-if="authStore.user?.position === 'employee' && ctx.storeId"
    class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex"
  >
    <RouterLink
      :to="`/stores/${ctx.storeId}/today`"
      class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-gray-400 transition-colors [&.router-link-active]:text-brand-600"
    >
      <i class="pi pi-home text-xl" />
      <span>{{ t('schedule.today') }}</span>
    </RouterLink>
    <RouterLink
      :to="`/stores/${ctx.storeId}/my-week`"
      class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-gray-400 transition-colors [&.router-link-active]:text-brand-600"
    >
      <i class="pi pi-calendar-clock text-xl" />
      <span>{{ t('nav.myWeek') }}</span>
    </RouterLink>
    <RouterLink
      :to="`/stores/${ctx.storeId}/leave`"
      class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-gray-400 transition-colors [&.router-link-active]:text-brand-600"
    >
      <i class="pi pi-calendar-minus text-xl" />
      <span>{{ t('nav.leave') }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, resolveComponent, watch, type VNode } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useLocale } from '@/composables/useLocale'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/stores/storeContext'
import { useAppVersion } from '@/composables/useAppVersion'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const { t }      = useI18n()
const { locale, setLocale, SUPPORTED_LOCALES } = useLocale()
const auth       = useAuth()
const authStore  = useAuthStore()
const ctx        = useStoreContext()
const route      = useRoute()
const router     = useRouter()
const appVersion    = useAppVersion()
const aboutOpen     = ref(false)
const mobileMenuOpen = ref(false)

// Set <html lang> on mount for accessibility / SEO
onMounted(() => document.documentElement.setAttribute('lang', locale.value))

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
  setup(props: { to: string; icon: string; label: string; collapsed?: boolean }) {
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
  setup(props: { label: string }, { slots }: { slots: Record<string, (() => VNode | VNode[] | null) | undefined> }) {
    return () =>
      h('div', { class: 'mb-3' }, [
        h('p', { class: 'px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400' }, props.label),
        h('div', { class: 'space-y-0.5' }, slots.default?.() || undefined),
      ])
  },
}
</script>

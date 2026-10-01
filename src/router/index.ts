import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useOptionsStore } from '@/stores/optionsStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/claim/:token',
    name: 'claim',
    component: () => import('@/views/ClaimView.vue'),
    meta: { public: true },
  },
  {
    path: '/stores/:storeId',
    component: () => import('@/components/layout/AppShell.vue'),
    children: [
      // ── Manager routes ────────────────────────────────────────────
      {
        path: 'planner',
        name: 'planner',
        component: () => import('@/features/schedule/views/PlannerView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      {
        path: 'schedule',
        name: 'manager-shell',
        component: () => import('@/features/schedule/views/ManagerShellView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      {
        path: 'today',
        name: 'today',
        component: () => import('@/features/employee/views/TodayView.vue'),
        meta: { requiresRole: 'employee', layer: 'employee' },
      },
      {
        path: 'rules',
        name: 'rules',
        component: () => import('@/features/rules/views/RulesView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      {
        path: 'coverage',
        name: 'coverage',
        component: () => import('@/features/coverage/views/CoverageDashboardView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      {
        path: 'templates',
        name: 'templates',
        component: () => import('@/features/templates/views/TemplateEditorView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      {
        path: 'config',
        name: 'config',
        component: () => import('@/features/config/views/StoreConfigView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      {
        path: 'leave/approve',
        name: 'leave-approve',
        component: () => import('@/features/leave/views/LeaveApprovalView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      {
        path: 'swaps/approve',
        name: 'swaps-approve',
        component: () => import('@/features/swap/views/SwapApprovalView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      // ── Manager team view ─────────────────────────────────────────
      {
        path: 'team',
        name: 'team',
        component: () => import('@/features/manager/views/ManagerTeamView.vue'),
        meta: { requiresRole: 'manager', layer: 'planner' },
      },
      // ── Employee routes ───────────────────────────────────────────
      {
        path: 'my-week',
        name: 'my-week',
        component: () => import('@/features/employee/views/MyWeekView.vue'),
        meta: { requiresRole: 'employee', layer: 'employee' },
      },
      {
        path: 'leave',
        name: 'leave',
        component: () => import('@/features/leave/views/LeaveCalendarView.vue'),
        meta: { requiresRole: 'employee', layer: 'employee' },
      },
    ],
  },
  // ── Admin routes ──────────────────────────────────────────────────
  {
    path: '/admin',
    component: () => import('@/components/layout/AppShell.vue'),
    meta: { requiresRole: 'admin', layer: 'admin' },
    children: [
      {
        path: '',
        name: 'admin',
        component: () => import('@/features/admin/views/AdminDashboardView.vue'),
      },
      {
        path: 'stores',
        name: 'admin-stores',
        component: () => import('@/features/admin/views/AdminStoresView.vue'),
      },
      {
        path: 'managers',
        name: 'admin-managers',
        component: () => import('@/features/admin/views/AdminManagersView.vue'),
      },
      {
        path: 'employees',
        name: 'admin-employees',
        component: () => import('@/features/admin/views/AdminEmployeesView.vue'),
      },
      {
        path: 'audit-logs',
        name: 'admin-audit-logs',
        component: () => import('@/features/admin/views/AuditLogsView.vue'),
      },
      {
        path: 'contracts',
        name: 'admin-contracts',
        component: () => import('@/features/admin/views/ContractManagementView.vue'),
      },
    ],
  },
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Sign-in runs on the backend (BFF): the guard first asks GET /bff/session,
// once per page load, whether this browser has a session, then decides.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensureSession()

  // Landing page: send signed-in users straight to the app, role-aware
  if (to.name === 'landing' && auth.isAuthenticated && auth.user?.store_id) {
    const pos = auth.user.position
    if (pos === 'employee') return { name: 'today', params: { storeId: auth.user.store_id } }
    if (pos === 'admin') return { name: 'admin' }
    return { name: 'planner', params: { storeId: auth.user.store_id } }
  }

  if (to.meta.public) return true

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // A Socrate account with no Parashift employee yet: it claims an invite first.
  if (!auth.user) {
    return { name: 'login', query: { error: 'no_account' } }
  }

  // Lazily bootstrap option lists once per session (no-op when already loaded).
  useOptionsStore().fetchOptions()

  const requiredRole = to.meta.requiresRole as string | undefined
  if (requiredRole && auth.user.position !== requiredRole && auth.user.position !== 'admin') {
    // Managers are a superset of employees — allow them on employee-layer routes too.
    if (auth.user.position === 'manager' && requiredRole === 'employee') return true
    // Role mismatch: redirect managers to their planner, everyone else to login.
    if (auth.user.position === 'manager' && auth.user.store_id) {
      return { name: 'planner', params: { storeId: auth.user.store_id } }
    }
    return { name: 'login' }
  }

  return true
})

router.afterEach((to) => {
  const layer = to.meta.layer as string | undefined
  if (layer === 'planner' || layer === 'employee' || layer === 'admin') {
    useUiStore().setLayer(layer)
  }
})

export default router

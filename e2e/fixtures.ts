import { test as base, type Page } from '@playwright/test'

// ── Stable test UUIDs ─────────────────────────────────────────────────────────
export const STORE_ID    = 'a1b2c3d4-0000-0000-0000-000000000001'
export const SHIFT_ID    = 'b2c3d4e5-0000-0000-0000-000000000002'
export const EMPLOYEE_ID = 'c3d4e5f6-0000-0000-0000-000000000003'

// ── Mock users ────────────────────────────────────────────────────────────────
export const MOCK_MANAGER: MockUser = {
  id:       'd4e5f6a7-0000-0000-0000-000000000004',
  email:    'manager@parashift.test',
  name:     'Test Manager',
  position: 'manager',
  store_id: STORE_ID,
}

// EMPLOYEE_ID is shared so auth.user.id matches assignment.employee_id in tests.
export const MOCK_EMPLOYEE: MockUser = {
  id:       EMPLOYEE_ID,
  email:    'employee@parashift.test',
  name:     'Test Employee',
  position: 'employee',
  store_id: STORE_ID,
}

interface MockUser {
  id: string; email: string; name: string
  position: 'manager' | 'employee' | 'admin'; store_id?: string
}

// ── Sign-in ───────────────────────────────────────────────────────────────────
// The backend's BFF owns sign-in: the SPA asks GET /bff/session whether the
// browser has a session, then loads the profile from GET /api/v1/me. signInAs()
// answers both as for a signed-in user (with a CSRF token) and ends the session
// on POST /bff/logout. No token is involved, and nothing in the app is
// bypassed. e2e/auth.spec.ts runs the sign-in itself: /bff/login → a fake
// issuer → /bff/callback → back into the app.
export const CSRF = 'csrf-from-the-bff'

export async function signInAs(page: Page, user: MockUser) {
  let signedIn = true
  await page.route('**/bff/session', route => route.fulfill({
    headers: { 'Cache-Control': 'no-store' },
    json: signedIn
      ? { authenticated: true, user: { sub: user.id, email: user.email, name: user.name }, csrf: CSRF }
      : { authenticated: false },
  }))
  await page.route('**/api/v1/me', route => route.fulfill({ json: user }))
  await page.route('**/bff/logout', (route) => {
    signedIn = false
    return route.fulfill({ status: 204 })
  })
}

// ── Router navigation without full page reload ────────────────────────────────
export async function routerPush(page: Page, path: string) {
  await page.evaluate((p) => {
    const app = (window as any).__vue_app__
    app?.config?.globalProperties?.$router?.push(p)
  }, path)
}

// ── API mocking ───────────────────────────────────────────────────────────────
// Mock all /api/v1/** calls with sensible defaults. Tests can override specific
// routes by calling page.route() BEFORE calling mockApiCalls().
export async function mockApiCalls(
  page: Page,
  overrides: Record<string, object> = {},
) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url()

    // The profile belongs to signInAs(), whichever was registered last.
    if (new URL(url).pathname === '/api/v1/me') return route.fallback()

    // Check overrides first
    const overrideKey = Object.keys(overrides).find((k) => url.includes(k))
    if (overrideKey) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(overrides[overrideKey]),
      })
    }

    // Default empty responses by endpoint pattern
    // scheduleStore reads res.data directly (array) — no { data: [] } wrapper
    if (url.includes('/shifts'))      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    if (url.includes('/assignments')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    if (url.includes('/employees'))   return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    if (url.includes('/rules'))       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    if (url.includes('/templates'))   return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    if (url.includes('/coverage'))    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ gap_count: 0, items: [], total_slots: 0 }) })
    if (url.includes('/leave'))       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    if (url.includes('/swap-requests')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    if (url.includes('/swaps'))        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    if (url.includes('/ai/'))         return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    if (url.includes('/plans'))       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PLAN_DRAFT) })
    if (url.includes('/users/me'))    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MANAGER) })

    // Anything else is a path no test mocks: answer as the API would for an
    // unknown route. Calls are same-origin, so letting it through would reach
    // vite preview, which answers index.html with 200.
    return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: `no mock for ${new URL(url).pathname}` } } })
  })
}

// ── Inject store context (week + scheme) ──────────────────────────────────────
export async function injectStoreContext(
  page: Page,
  opts: { storeId?: string; weekStart?: string; scheme?: 'A' | 'B' } = {},
) {
  await page.evaluate(({ storeId, weekStart, scheme }) => {
    // Pinia v3: access via the Vue app element (app.config.globalProperties.$pinia is always set)
    const el    = document.querySelector('#app') as any
    const pinia = el?.__vue_app__?.config?.globalProperties?.$pinia
    if (!pinia) return
    const ctx = pinia._s?.get('storeContext')
    if (!ctx) return
    if (storeId)   ctx.storeId      = storeId
    if (weekStart) ctx.weekStart    = weekStart
    if (scheme)    ctx.activeScheme = scheme
  }, { storeId: opts.storeId ?? STORE_ID, weekStart: opts.weekStart, scheme: opts.scheme })
}

// ── Plan/Schedule mocks ───────────────────────────────────────────────────────
export const MOCK_PLAN_DRAFT = {
  id: 'plan-001',
  store_id: STORE_ID,
  week_start: '2026-03-30',
  state: 'DRAFT',
  snapshots: [],
  override_log: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const MOCK_PLAN_PUBLISHED = {
  ...MOCK_PLAN_DRAFT,
  state: 'PUBLISHED',
  snapshots: [
    {
      taken_at: new Date().toISOString(),
      shift_count: 2,
      assignment_count: 1,
      coverage_rate: 0.5,
    },
  ],
}

export const MOCK_SHIFTS_FULL = [
  {
    id: SHIFT_ID,
    store_id: STORE_ID,
    scheme: 'A',
    date: '2026-03-30',
    start_time: '09:00',
    end_time: '17:00',
    role: 'PHARMACIST',
    required_count: 2,
    status: 'DRAFT',
    source: 'MANUAL',
    needs_cover: false,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'shift-002',
    store_id: STORE_ID,
    scheme: 'A',
    date: '2026-03-31',
    start_time: '14:00',
    end_time: '22:00',
    role: 'TECH',
    required_count: 1,
    status: 'DRAFT',
    source: 'MANUAL',
    needs_cover: false,
    created_at: '',
    updated_at: '',
  },
]

export const MOCK_EMPLOYEES_FULL = [
  {
    id: EMPLOYEE_ID,
    name: 'Alice Smith',
    position: 'employee',
    job_role: 'PHARMACIST',
    contract_hours_per_week: 40,
    start_date: '2020-01-01',
    store_id: STORE_ID,
    email: 'alice@test.com',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'emp-002',
    name: 'Bob Jones',
    position: 'employee',
    job_role: 'TECH',
    contract_hours_per_week: 32,
    start_date: '2020-01-01',
    store_id: STORE_ID,
    email: 'bob@test.com',
    created_at: '',
    updated_at: '',
  },
]

// ── Extended fixture types ────────────────────────────────────────────────────
type TestFixtures = {
  managerPage:  Page
  employeePage: Page
}

export const test = base.extend<TestFixtures>({
  managerPage: async ({ page }, use) => {
    await signInAs(page, MOCK_MANAGER)
    await use(page)
  },
  employeePage: async ({ page }, use) => {
    await signInAs(page, MOCK_EMPLOYEE)
    await use(page)
  },
})

export { expect } from '@playwright/test'

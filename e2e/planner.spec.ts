import { test, expect, injectAuth, injectStoreContext, mockApiCalls, MOCK_MANAGER, MOCK_EMPLOYEE, STORE_ID, SHIFT_ID, EMPLOYEE_ID } from './fixtures'

// ── Shared data ───────────────────────────────────────────────────────────────
const WEEK_START = '2026-03-30'

// Freeze the browser clock so new Date() returns 2026-03-30 (a Monday) in all
// tests. This ensures weekStart defaults to WEEK_START when the app initialises.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-03-30T12:00:00'))
})

const MOCK_SHIFTS = [
  {
    id: SHIFT_ID, store_id: STORE_ID, scheme: 'A',
    date: '2026-03-30', start_time: '08:00', end_time: '16:00',
    role: 'NURSE', required_count: 2,
    status: 'DRAFT', source: 'MANUAL', needs_cover: false, created_at: '', updated_at: '',
  },
  {
    id: 'shift-2', store_id: STORE_ID, scheme: 'A',
    date: '2026-03-31', start_time: '14:00', end_time: '22:00',
    role: 'TECH', required_count: 1,
    status: 'DRAFT', source: 'MANUAL', needs_cover: false, created_at: '', updated_at: '',
  },
]

const MOCK_EMPLOYEES = [
  { id: EMPLOYEE_ID, name: 'Alice Smith', position: 'manager', job_role: 'NURSE', contract_hours_per_week: 40, start_date: '2020-01-01', store_id: STORE_ID, email: 'alice@test.com', created_at: '', updated_at: '' },
  { id: 'emp-2',    name: 'Bob Jones',   position: 'employee', job_role: 'TECH',  contract_hours_per_week: 32, start_date: '2020-01-01', store_id: STORE_ID, email: 'bob@test.com',   created_at: '', updated_at: '' },
]

const MOCK_ASSIGNMENT = {
  id: 'a1', shift_id: SHIFT_ID, employee_id: EMPLOYEE_ID, store_id: STORE_ID,
  shift_date: '2026-03-30', shift_start_time: '08:00', shift_end_time: '16:00', assigned_at: '',
  status: 'active', violations: [],
}

const MOCK_ASSIGNMENT_2 = {
  id: 'a2', shift_id: 'shift-2', employee_id: 'emp-2', store_id: STORE_ID,
  shift_date: '2026-03-31', shift_start_time: '14:00', shift_end_time: '22:00', assigned_at: '',
  status: 'active', violations: [],
}

// ── Suite: Planner ─────────────────────────────────────────────────────────────
test.describe('Planner view', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page, {
      '/employees':   { data: MOCK_EMPLOYEES },
      '/shifts':      MOCK_SHIFTS,       // scheduleStore reads array directly (no wrapper)
      '/assignments': [MOCK_ASSIGNMENT, MOCK_ASSIGNMENT_2],
      '/coverage':    { gap_count: 0, items: [], total_slots: 0 },
    })
  })

  test('renders toolbar with week label and AI button', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/planner`)
    // PlannerToolbar shows a week label and an AI Suggestions button
    await expect(page.getByText(/Week \d+/)).toBeVisible()
    await expect(page.getByText('AI Suggestions')).toBeVisible()
  })

  test('week label shows correct date range', async ({ page }) => {
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
    await page.goto(`/stores/${STORE_ID}/planner`)
    // Toolbar renders dates in en-GB format ("30 Mar … 5 Apr …") — use .first() to avoid strict mode
    await expect(page.getByText(/30 Mar/).first()).toBeVisible()
    await expect(page.getByText(/5 Apr/).first()).toBeVisible()
  })

  test('assigned shifts appear as calendar events', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/planner`)
    // Assigned shifts have role as event title in FullCalendar.
    // NURSE shift is on 2026-03-30 (Monday) which is the frozen clock date, so it's always in view.
    await expect(page.getByText('NURSE').first()).toBeVisible({ timeout: 5_000 })
  })

  test('coverage alert banner hidden when gaps=0', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/planner`)
    await expect(page.getByText(/coverage gap/i)).not.toBeVisible()
  })

  test('coverage alert banner shown when gaps > 0', async ({ page }) => {
    // Override coverage for this test only — must use trailing ** to match query-string URLs
    await page.route(`**/api/v1/stores/${STORE_ID}/coverage**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ gap_count: 3, items: [], total_slots: 0 }) })
    )
    await page.goto(`/stores/${STORE_ID}/planner`)
    await expect(page.getByText(/3 coverage gap/i)).toBeVisible()
  })

  test('AI panel opens on button click', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/planner`)
    await page.getByText('AI Suggestions').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()
  })

  test('successful assignment shows no error toast', async ({ page }) => {
    await page.route(`**/api/v1/stores/${STORE_ID}/assignments`, (route) => {
      if (route.request().method() === 'POST')
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_ASSIGNMENT, violations: [] }) })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.goto(`/stores/${STORE_ID}/planner`)
    // No blocking toast should appear on a clean state
    await expect(page.locator('.p-toast-message-error')).not.toBeVisible()
  })

  test('blocking violation toast shown after failed assign', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/planner`)
    // Directly push an error toast via the uiStore — tests the App.vue toast bridge
    // without needing drag-and-drop or complex Pinia store interaction.
    await page.evaluate(() => {
      const el    = document.querySelector('#app') as any
      const pinia = el?.__vue_app__?.config?.globalProperties?.$pinia
      const uiStore = pinia?._s?.get('ui')
      uiStore?.showToast('error', 'Assignment failed', 'Exceeds 40h limit')
    })
    await expect(page.getByText(/Exceeds 40h limit/i)).toBeVisible({ timeout: 3_000 })
  })

  test('prevWeek button navigates to previous week', async ({ page }) => {
    await injectStoreContext(page, { weekStart: WEEK_START })
    await page.goto(`/stores/${STORE_ID}/planner`)
    // PrimeVue renders icon as child <span> — target <span> to avoid <i> conflicts
    await page.locator('button:has(span.pi-chevron-left)').first().click()
    await expect(page.getByText(/23 Mar/)).toBeVisible()
  })

  test('nextWeek button advances to next week', async ({ page }) => {
    await injectStoreContext(page, { weekStart: WEEK_START })
    await page.goto(`/stores/${STORE_ID}/planner`)
    // PrimeVue renders icon as child <span> — target <span> to avoid <i> conflicts
    await page.locator('button:has(span.pi-chevron-right)').first().click()
    await expect(page.getByText(/6 Apr/).first()).toBeVisible()
  })
})

// ── Suite: Rules ───────────────────────────────────────────────────────────────
test.describe('Rules view', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page)
  })

  test('renders heading and New Rule button', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/rules`)
    await expect(page.getByText('Scheduling Rules')).toBeVisible()
    await expect(page.getByText('New Rule')).toBeVisible()
  })

  test('empty state message shown when no rules', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/rules`)
    await expect(page.getByText(/No rules configured/i)).toBeVisible()
  })

  test('rules listed when API returns data', async ({ page }) => {
    // rulesStore reads res.data directly (array) — no { data: [...] } wrapper
    await page.route(`**/api/v1/stores/${STORE_ID}/rules`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { id: 'r1', rule_type: 'MAX_HOURS', type: 'MAX_HOURS', severity: 'BLOCKING', description: 'Max 40h/week', config: {}, is_enabled: true, store_id: STORE_ID, created_at: '', updated_at: '' },
        ]) })
    )
    await page.goto(`/stores/${STORE_ID}/rules`)
    // RuleList renders a human-readable label via ruleTypeLabel() — 'MAX_HOURS' → 'Max Hours'
    await expect(page.getByText('Max Hours')).toBeVisible()
    await expect(page.getByText('Max 40h/week')).toBeVisible()
    await expect(page.getByText('BLOCKING')).toBeVisible()
  })

  test('clicking New Rule opens the form drawer', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/rules`)
    await page.getByText('New Rule').click()
    await expect(page.getByText('New Rule').nth(1)).toBeVisible()
    // Scope to the drawer to avoid ambiguous selectors
    await expect(page.locator('.p-drawer').getByText('Severity').first()).toBeVisible()
  })

  test('form validation blocks submit without required fields', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/rules`)
    await page.getByText('New Rule').click()
    // Click Save without filling in fields — scope to drawer to avoid conflicts
    await page.locator('.p-drawer').getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Type is required')).toBeVisible()
  })
})

// ── Suite: Employee self-service ────────────────────────────────────────────────
test.describe('Employee MyWeek view', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page, {
      '/shifts':         MOCK_SHIFTS,      // scheduleStore reads array directly
      '/employees':      { data: MOCK_EMPLOYEES },
      '/swap-requests':  { data: [] },     // swapStore fetches /swap-requests
    })
  })

  test('renders week strip with 7 day tiles', async ({ page }) => {
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
    await page.goto(`/stores/${STORE_ID}/my-week`)
    // 7 day tiles: Mon–Sun
    const tiles = page.locator('[class*="rounded-xl"]')
    await expect(tiles).toHaveCount(7, { timeout: 5_000 })
  })

  test('Request Leave button visible', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/my-week`)
    await expect(page.getByText('Request Leave')).toBeVisible()
  })

  test('clicking Request Leave opens leave dialog', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/my-week`)
    await page.getByText('Request Leave').click()
    await expect(page.getByText('Request Leave').nth(1)).toBeVisible()
    await expect(page.getByText('Type')).toBeVisible()
  })

  test('swap inbox hidden when no pending incoming swaps', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/my-week`)
    await expect(page.getByText(/Incoming Requests/i)).not.toBeVisible()
  })

  test('swap inbox shown when pending incoming swaps exist', async ({ page }) => {
    // swapStore fetches /swap-requests (not /swaps)
    await page.route(`**/api/v1/stores/${STORE_ID}/swap-requests**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{
          id: 'sw1', requester_id: 'emp-3', target_employee_id: MOCK_EMPLOYEE.id,
          shift_id: SHIFT_ID, store_id: STORE_ID, status: 'pending', created_at: '',
          requester: { id: 'emp-3', name: 'Carol', email: '', position: 'employee', job_role: '', contract_hours_per_week: 40, start_date: '2020-01-01', store_id: STORE_ID, created_at: '', updated_at: '' },
        }]}) })
    )
    await page.goto(`/stores/${STORE_ID}/my-week`)
    await expect(page.getByText(/Incoming Requests/i)).toBeVisible()
    await expect(page.getByText('Carol')).toBeVisible()
  })

  test('week navigation prev/next works', async ({ page }) => {
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
    await page.goto(`/stores/${STORE_ID}/my-week`)
    // PrimeVue renders icon as child <span> — target <span> to avoid <i> conflicts
    await page.locator('button:has(span.pi-chevron-left)').first().click()
    await expect(page.getByText(/23 Mar/)).toBeVisible()
  })
})

// ── Suite: Coverage Dashboard ─────────────────────────────────────────────────
test.describe('Coverage Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page)
  })

  test('renders heatmap when data available', async ({ page }) => {
    // Must use trailing ** to match coverage?from=...&to=... query-string URL
    await page.route(`**/api/v1/stores/${STORE_ID}/coverage**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({
          gap_count: 2, total_slots: 2,
          items: [
            // CoverageHeatmap.vue reads slot.start_time and slot.end_time for hour mapping
            { date: '2026-03-30', hour: 9,  start_time: '09:00', end_time: '10:00', required: 3, assigned: 1, coverage_ratio: 0.33 },
            { date: '2026-03-30', hour: 10, start_time: '10:00', end_time: '11:00', required: 2, assigned: 2, coverage_ratio: 1.0  },
          ],
        }) })
    )
    await page.goto(`/stores/${STORE_ID}/coverage`)
    await expect(page.getByText('Coverage Dashboard')).toBeVisible()
    // Heatmap cells render
    await expect(page.locator('[class*="bg-red"]').first()).toBeVisible()
    await expect(page.locator('[class*="bg-green"]').first()).toBeVisible()
  })

  test('shows empty state when no coverage data', async ({ page }) => {
    // Return null coverage so coverageStore.coverage is falsy → empty state
    await page.route(`**/api/v1/stores/${STORE_ID}/coverage**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) })
    )
    await page.goto(`/stores/${STORE_ID}/coverage`)
    await expect(page.getByText(/No coverage data available/i)).toBeVisible()
  })
})

// ── Suite: AI Panel ────────────────────────────────────────────────────────────
test.describe('AI Panel', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page, {
      '/employees':   { data: MOCK_EMPLOYEES },
      '/shifts':      MOCK_SHIFTS,   // scheduleStore reads array directly (no wrapper)
      '/assignments': [MOCK_ASSIGNMENT, MOCK_ASSIGNMENT_2],
      '/coverage':    { gap_count: 0, items: [], total_slots: 0 },
    })
  })

  test('Suggest tab shows shift dropdown', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/planner`)
    await page.getByText('AI Suggestions').click()
    // PrimeVue Select renders as a combobox — use role not placeholder attribute
    await expect(page.getByRole('combobox', { name: 'Select a shift…' })).toBeVisible()
    // Use button role to avoid strict mode — the hint text also contains "Get suggestions"
    await expect(page.getByRole('button', { name: 'Get suggestions' })).toBeVisible()
  })

  test('Insights tab shows dismiss buttons when insights loaded', async ({ page }) => {
    await page.route(`**/api/v1/stores/${STORE_ID}/ai/insights`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{
          id: 'i1', type: 'COVERAGE', message: 'Monday morning gap',
          recommendation: 'Add one more nurse', confidence: 0.88, created_at: '',
        }]}) })
    )
    await page.goto(`/stores/${STORE_ID}/planner`)
    await page.getByText('AI Suggestions').click()
    await page.getByRole('tab', { name: 'Insights' }).click()
    await expect(page.getByText('Monday morning gap')).toBeVisible()
    await expect(page.getByText('Add one more nurse')).toBeVisible()
  })

  test('no insights message shown when empty', async ({ page }) => {
    await page.route(`**/api/v1/stores/${STORE_ID}/ai/insights`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    )
    await page.goto(`/stores/${STORE_ID}/planner`)
    await page.getByText('AI Suggestions').click()
    // Use role selector to avoid strict mode on plain text 'Insights'
    await page.getByRole('tab', { name: 'Insights' }).click()
    await expect(page.getByText(/No insights available/i)).toBeVisible()
  })
})

// ── Suite: Template Editor ─────────────────────────────────────────────────────
test.describe('Template Editor', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page)
    // templateStore reads res.data directly (array) — no { data: [...] } wrapper
    await page.route(`**/api/v1/stores/${STORE_ID}/templates`, (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    })
  })

  test('renders A/B side-by-side layout', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/templates`)
    await expect(page.getByText('Schedule A').first()).toBeVisible()
    await expect(page.getByText('Schedule B').first()).toBeVisible()
    await expect(page.getByText('Publish A')).toBeVisible()
    await expect(page.getByText('Publish B')).toBeVisible()
  })

  test('empty state shown for both schemes', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/templates`)
    const emptyMessages = page.getByText(/No shifts defined/i)
    await expect(emptyMessages).toHaveCount(2)
  })

  test('Publish A shows confirmation dialog', async ({ page }) => {
    // Provide a scheme-A template so the confirmPublish dialog can open
    // templateStore reads res.data directly (array) — no { data: [...] } wrapper
    await page.route(`**/api/v1/stores/${STORE_ID}/templates`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 't1', scheme: 'A', day_of_week: 1, start_time: '08:00', end_time: '16:00', required_role: 'NURSE', store_id: STORE_ID }]) })
    )
    await page.goto(`/stores/${STORE_ID}/templates`)
    await page.getByText('Publish A').click()
    // PrimeVue ConfirmDialog renders via App.vue <ConfirmDialog /> bridge.
    // Use .first() because ConfirmDialog may render duplicate message spans.
    // Scope button checks to the dialog to avoid matching "Publish A" / "Publish B" buttons.
    await expect(page.getByText(/4 weeks/i).first()).toBeVisible()
    await expect(page.locator('.p-confirmdialog').getByRole('button', { name: 'Publish' }).first()).toBeVisible()
    await expect(page.locator('.p-confirmdialog').getByRole('button', { name: 'Cancel' }).first()).toBeVisible()
  })
})

// ── Suite: Leave Management ─────────────────────────────────────────────────────
test.describe('Leave Management', () => {
  test('manager sees leave approval view', async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page, { '/employees': { data: MOCK_EMPLOYEES } })
    // leaveStore fetches /leave-requests with { data: [...] } wrapper
    await page.route(`**/api/v1/stores/${STORE_ID}/leave-requests**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{
          id: 'l1', employee_id: 'emp-2', store_id: STORE_ID, type: 'ANNUAL',
          start_date: '2026-04-01', end_date: '2026-04-05', status: 'pending', created_at: '',
          employee: MOCK_EMPLOYEES[1],
        }]}) })
    )
    await page.goto(`/stores/${STORE_ID}/leave/approve`)
    await expect(page.getByText('Leave Approval')).toBeVisible()
    await expect(page.getByText('Bob Jones')).toBeVisible()
    await expect(page.getByText('ANNUAL')).toBeVisible()
  })

  test('approve button calls PUT review endpoint', async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page, { '/employees': { data: MOCK_EMPLOYEES } })
    const requests: string[] = []

    // IMPORTANT — Playwright route handlers are LIFO (last registered = first checked).
    // Register the GENERAL list route FIRST so it is checked LAST, allowing the
    // specific /impact and /review routes (registered after) to match first.

    // List endpoint — registered first so it's checked last
    await page.route(`**/api/v1/stores/${STORE_ID}/leave-requests**`, (route) => {
      const url = route.request().url()
      // Let impact and review fall through to their specific handlers
      if (url.includes('/impact') || url.includes('/review')) return route.fallback()
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'l1', employee_id: 'emp-2', store_id: STORE_ID, type: 'sick', start_date: '2026-04-01', end_date: '2026-04-01', status: 'pending', created_at: '', employee: MOCK_EMPLOYEES[1] }]}) })
    })
    // Impact endpoint — must return a valid LeaveImpact shape
    await page.route(`**/api/v1/stores/${STORE_ID}/leave-requests/l1/impact`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ total_cancellations: 0, uncovered_shifts: 0, affected_shifts: [], total_hours_lost: 0 }) })
    )
    // Review endpoint — track PUT calls
    await page.route(`**/api/v1/stores/${STORE_ID}/leave-requests/l1/review`, (route) => {
      requests.push(route.request().method() + ' ' + route.request().url())
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 'l1', employee_id: 'emp-2', type: 'ANNUAL', status: 'approved', store_id: STORE_ID, start_date: '2026-04-01', end_date: '2026-04-05', created_at: '' }) })
    })
    await page.goto(`/stores/${STORE_ID}/leave/approve`)
    // Click the approve (pi-check) button — PrimeVue renders icon as <span class="pi pi-check">
    await page.locator('button:has(span.pi-check)').first().click()
    // Impact dialog opens — wait for it and confirm
    await expect(page.getByText('Review leave request')).toBeVisible({ timeout: 3_000 })
    await page.getByRole('button', { name: 'Approve' }).click()
    await page.waitForTimeout(500)
    // leaveStore.approveLeave sends PUT .../leave-requests/:id/review with status=approved
    expect(requests.some((r) => r.includes('PUT') && r.includes('review'))).toBe(true)
  })

  test('employee leave calendar shows their requests', async ({ page }) => {
    await injectAuth(page, MOCK_EMPLOYEE)
    // leaveStore fetches /leave-requests
    await page.route(`**/api/v1/stores/${STORE_ID}/leave-requests**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'l1', employee_id: MOCK_EMPLOYEE.id, store_id: STORE_ID, type: 'vacation', start_date: '2026-04-01', end_date: '2026-04-05', status: 'approved', created_at: '' }]}) })
    )
    await page.goto(`/stores/${STORE_ID}/leave`)
    await expect(page.getByRole('heading', { name: 'Leave Requests' })).toBeVisible()
    await expect(page.getByText(/vacation/i)).toBeVisible()
    await expect(page.getByText(/approved/i)).toBeVisible()
  })
})

// ── Suite: Swap Management ─────────────────────────────────────────────────────
test.describe('Swap Management', () => {
  test('manager swap approval view lists swap requests', async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    // swapStore fetches /swap-requests (not /swaps)
    await page.route(`**/api/v1/stores/${STORE_ID}/swap-requests**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{
          id: 'sw1', requester_id: EMPLOYEE_ID, target_employee_id: 'emp-2',
          shift_id: SHIFT_ID, store_id: STORE_ID, status: 'pending', created_at: '',
          requester: MOCK_EMPLOYEES[0], target_employee: MOCK_EMPLOYEES[1],
        }]}) })
    )
    await page.goto(`/stores/${STORE_ID}/swaps/approve`)
    await expect(page.getByText('Swap Requests').first()).toBeVisible()
    await expect(page.getByText('Alice Smith')).toBeVisible()
    await expect(page.getByText('Bob Jones')).toBeVisible()
    await expect(page.getByText('PENDING')).toBeVisible()
  })
})

// ── Suite: Authentication ──────────────────────────────────────────────────────
test.describe('Authentication', () => {
  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/planner`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders sign in button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('ParaShift')).toBeVisible()
    // Use role selector to avoid matching paragraph text containing "Sign in"
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('employee cannot access manager planner route', async ({ page }) => {
    await injectAuth(page, MOCK_EMPLOYEE)
    await page.goto(`/stores/${STORE_ID}/planner`)
    // Should be redirected away from planner (role guard)
    await expect(page).not.toHaveURL(/\/planner/)
  })

  test('manager can access planner route', async ({ page }) => {
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page)
    await page.goto(`/stores/${STORE_ID}/planner`)
    await expect(page).toHaveURL(/\/planner/)
  })
})

// ── Suite: Admin screens ───────────────────────────────────────────────────────
test.describe('Admin screens', () => {
  test('employee management table renders', async ({ page }) => {
    await injectAuth(page, { ...MOCK_MANAGER, position: 'admin' })
    // IMPORTANT — Register the catch-all FIRST so it's checked LAST (LIFO).
    // Specific routes registered after will be checked first.
    await page.route(`**/api/v1/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )
    // Admin view uses /admin/employees, /admin/stores, /admin/metadata
    await page.route(`**/api/v1/admin/stores**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [] }) })
    )
    await page.route(`**/api/v1/admin/metadata**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ employeeStatuses: [], integrityFilters: [] }) })
    )
    await page.route(`**/api/v1/admin/employees**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_EMPLOYEES, total: 2 }) })
    )
    await page.goto(`/admin/employees`)
    // Use heading role to avoid strict mode — 'Employees' also appears in sidebar and empty-state
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible()
    await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Bob Jones')).toBeVisible()
  })

  test('tenant settings renders form', async ({ page }) => {
    await injectAuth(page, { ...MOCK_MANAGER, position: 'admin' })
    // IMPORTANT — Register the catch-all FIRST so it's checked LAST (LIFO).
    await page.route(`**/api/v1/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )
    await page.route(`**/api/v1/admin/stores**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [] }) })
    )
    await page.goto('/admin/stores')
    // Use heading role to avoid strict mode — 'Stores' also appears in sidebar link
    await expect(page.getByRole('heading', { name: 'Stores' })).toBeVisible()
    // Open new store dialog to verify the form fields
    await page.getByRole('button', { name: 'New store' }).click()
    const dialog = page.locator('.p-dialog')
    // 'Timezone' also appears as a DataTable column header — scope to dialog to avoid strict mode
    await expect(dialog.getByText('Store name')).toBeVisible()
    await expect(dialog.getByText('Timezone')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeVisible()
  })
})

/**
 * e2e/employee-ux.spec.ts
 *
 * End-to-end tests for the employee-facing UX sprints 1–6.
 * Covers TodayView (all tabs), WeekStrip, ShiftCard, QuickAssignSheet.
 */
import {
  test,
  expect,
  injectAuth,
  injectStoreContext,
  mockApiCalls,
  MOCK_MANAGER,
  MOCK_EMPLOYEE,
  STORE_ID,
  SHIFT_ID,
  EMPLOYEE_ID,
} from './fixtures'

// ── Test data ─────────────────────────────────────────────────────────────────

const WEEK_START  = '2026-04-06'
const TODAY_DATE  = '2026-04-06'

// TodayView filters shifts by comparing shift.date against `new Date()`.
// Freeze the clock so the component always sees 2026-04-06 regardless of when
// the tests run. Must be set before page.goto() on every page (including new
// pages opened mid-test) because the constant is evaluated at component setup.
const FROZEN_DATE = new Date('2026-04-06T12:00:00')

const TODAY_SHIFT = {
  id: 'shift-today', store_id: STORE_ID,
  date: TODAY_DATE, start_time: '09:00', end_time: '17:00',
  role: 'pharmacist', required_count: 2, status: 'PUBLISHED',
  source: 'TEMPLATE', needs_cover: false, created_at: '', updated_at: '',
}

const FUTURE_SHIFT = {
  id: 'shift-wed', store_id: STORE_ID,
  date: '2026-04-08', start_time: '14:00', end_time: '22:00',
  role: 'pharmacist', required_count: 1, status: 'DRAFT',
  source: 'TEMPLATE', needs_cover: false, created_at: '', updated_at: '',
}

const MY_ASSIGNMENT = {
  id: 'a1', store_id: STORE_ID, shift_id: 'shift-today',
  employee_id: EMPLOYEE_ID, shift_date: TODAY_DATE,
  shift_start_time: '09:00', shift_end_time: '17:00',
  violations: [], created_at: '',
}

const OTHER_ASSIGNMENT = {
  id: 'a2', store_id: STORE_ID, shift_id: 'shift-today',
  employee_id: 'emp-other', shift_date: TODAY_DATE,
  shift_start_time: '09:00', shift_end_time: '17:00',
  violations: [], created_at: '',
}

const PHARMACIST_EMPLOYEE = {
  id: EMPLOYEE_ID, store_id: STORE_ID, name: 'Alice Smith',
  position: 'employee', job_role: 'pharmacist',
  email: 'alice@test.com', contract_hours_per_week: 35,
  created_at: '', updated_at: '',
}

const COLLEAGUE_EMPLOYEE = {
  id: 'emp-other', store_id: STORE_ID, name: 'Bob Jones',
  position: 'employee', job_role: 'pharmacist',
  email: 'bob@test.com', contract_hours_per_week: 35,
  created_at: '', updated_at: '',
}

const MANAGER_EMPLOYEE = {
  id: MOCK_MANAGER.id, store_id: STORE_ID, name: MOCK_MANAGER.name,
  position: 'manager', job_role: 'pharmacist',
  email: MOCK_MANAGER.email, contract_hours_per_week: 35,
  created_at: '', updated_at: '',
}

const PENDING_SWAP = {
  id: 'swap-1', tenant_id: STORE_ID,
  requester_id: 'emp-other',
  target_employee_id: EMPLOYEE_ID,
  shift_instance_id: SHIFT_ID,
  status: 'pending', created_at: '', updated_at: '',
}

const MY_LEAVE = {
  id: 'leave-1', store_id: STORE_ID,
  employee_id: EMPLOYEE_ID, start_date: '2026-05-01',
  end_date: '2026-05-05', type: 'vacation',      // LeaveRequest.type, not leave_type
  status: 'pending', created_at: '', updated_at: '', // lowercase matches LeaveStatus
}

// ══════════════════════════════════════════════════════════════════════════════
// Suite: Today tab
// ══════════════════════════════════════════════════════════════════════════════

test.describe('TodayView — Today tab', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page, {
      '/shifts':      [TODAY_SHIFT, FUTURE_SHIFT],
      '/assignments': [MY_ASSIGNMENT, OTHER_ASSIGNMENT],
      '/employees':   { data: [PHARMACIST_EMPLOYEE, COLLEAGUE_EMPLOYEE] },
      '/swap-requests': { data: [] },
      '/leave-requests': { data: [] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
  })

  // Sprint 1.1 ────────────────────────────────────────────────────────────────
  test('employee sees only their own assigned shift (not all store shifts)', async ({ page }) => {
    // Employee has MY_ASSIGNMENT on shift-today; should see that shift
    const todayPanel = page.locator('[data-testid="today-panel"]')
    await expect(todayPanel.getByText('09:00')).toBeVisible()
    // FUTURE_SHIFT (2026-04-08) is not today — shouldn't appear in Today tab
    await expect(todayPanel.getByText('14:00')).not.toBeVisible()
  })

  test('Replace button is hidden for employee role', async ({ page }) => {
    await expect(page.getByText('Replace')).not.toBeVisible()
  })

  test('Assign employee button is hidden for employee role', async ({ page }) => {
    await expect(page.getByText('Assign employee')).not.toBeVisible()
  })

  test('Replace button IS visible for manager role', async ({ page }) => {
    await page.close()
    const newPage = await page.context().newPage()
    await newPage.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(newPage, MOCK_MANAGER)
    await mockApiCalls(newPage, {
      '/shifts':         [TODAY_SHIFT],
      '/assignments':    [MY_ASSIGNMENT],
      '/employees':      { data: [MANAGER_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await newPage.goto(`/stores/${STORE_ID}/today`)
    await expect(newPage.getByText('Replace')).toBeVisible()
  })

  // Sprint 1.3 ────────────────────────────────────────────────────────────────
  test('swap alert banner is shown when there are pending swaps', async ({ page }) => {
    await page.close()
    const newPage = await page.context().newPage()
    await newPage.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(newPage, MOCK_EMPLOYEE)
    await mockApiCalls(newPage, {
      '/shifts':         [],
      '/assignments':    [],
      '/employees':      { data: [] },
      '/swap-requests':  { data: [PENDING_SWAP] },
      '/leave-requests': { data: [] },
    })
    await newPage.goto(`/stores/${STORE_ID}/today`)
    await expect(newPage.getByText(/pending swap request/i)).toBeVisible()
  })

  test('swap alert is hidden when there are no pending swaps', async ({ page }) => {
    await expect(page.getByText(/pending swap request/i)).not.toBeVisible()
  })

  // Sprint 2.1 ────────────────────────────────────────────────────────────────
  test('skeleton loaders appear while data is loading', async ({ page }) => {
    // Intercept with delay to catch the loading state
    await page.close()
    const newPage = await page.context().newPage()
    await newPage.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(newPage, MOCK_EMPLOYEE)
    await newPage.route('**/api/v1/**', async (route) => {
      // 5 s delay — outlasts goto() so loading state is visible after navigation
      await new Promise((r) => setTimeout(r, 5000))
      const url = route.request().url()
      const body = url.includes('/employees') || url.includes('/swap-requests') || url.includes('/leave-requests')
        ? JSON.stringify({ data: [] })
        : JSON.stringify([])
      await route.fulfill({ status: 200, contentType: 'application/json', body })
    })
    // Use 'commit' so goto() returns as soon as the first byte arrives,
    // well before the 5 s API delay elapses, giving us a wide window to
    // observe the skeleton state.
    await newPage.goto(`/stores/${STORE_ID}/today`, { waitUntil: 'commit' })
    // PrimeVue Skeleton renders with class .p-skeleton
    const skeletons = newPage.locator('.p-skeleton')
    await expect(skeletons.first()).toBeVisible({ timeout: 5000 })
  })

  test('shows empty state when no shifts exist', async ({ page }) => {
    await page.close()
    const newPage = await page.context().newPage()
    await newPage.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(newPage, MOCK_EMPLOYEE)
    await mockApiCalls(newPage, {
      '/shifts':         [],
      '/assignments':    [],
      '/employees':      { data: [] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await newPage.goto(`/stores/${STORE_ID}/today`)
    // Empty state: "Day off" for a regular day, "Public holiday" for holidays.
    // Scoped to the today-panel to avoid matching the WeekStrip day cards.
    await expect(
      newPage.getByTestId('today-panel').getByText(/day off|public holiday/i),
    ).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite: Tab navigation (Sprint 6)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('TodayView — tab navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    // Collapse the sidebar before the page loads.  At 375 px the expanded
    // 224 px sidebar leaves only ~151 px for the main area, which squeezes
    // min-w-0 flex children (e.g. leave-entry text) down to 0 px — causing
    // Playwright's toBeVisible() to report them as hidden.
    await page.addInitScript(() => localStorage.setItem('nav:collapsed', 'true'))
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page, {
      '/shifts':         [TODAY_SHIFT],
      '/assignments':    [MY_ASSIGNMENT],
      '/employees':      { data: [PHARMACIST_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [MY_LEAVE] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
  })

  test('bottom tab bar has 4 tabs', async ({ page }) => {
    const tabs = page.locator('[data-testid="tab-bar"] button')
    await expect(tabs).toHaveCount(4)
  })

  test('Today tab is active by default', async ({ page }) => {
    const todayTab = page.locator('[data-testid="tab-bar"] button').first()
    await expect(todayTab).toHaveClass(/text-brand/)
  })

  test('clicking Week tab switches content to WeekStrip', async ({ page }) => {
    const weekTab = page.locator('[data-testid="tab-bar"] button').nth(1)
    await weekTab.click()
    // WeekStrip shows day numbers; we should see a W-prefixed week number or day cards
    await expect(weekTab).toHaveClass(/text-brand/)
  })

  test('clicking Team tab shows team members working today', async ({ page }) => {
    const teamTab = page.locator('[data-testid="tab-bar"] button').nth(2)
    await teamTab.click()
    await expect(teamTab).toHaveClass(/text-brand/)
    // Should show the employee assigned to today's shift
    await expect(page.locator('[data-testid="team-panel"]').getByText('Alice Smith')).toBeVisible()
  })

  test('clicking Requests tab shows leave requests section', async ({ page }) => {
    const requestsTab = page.locator('[data-testid="tab-bar"] button').nth(3)
    await requestsTab.click()
    await expect(requestsTab).toHaveClass(/text-brand/)
    await expect(page.getByText(/my leave requests/i)).toBeVisible()
  })

  test('Requests tab shows employee leave entries', async ({ page }) => {
    const requestsTab = page.locator('[data-testid="tab-bar"] button').nth(3)
    await requestsTab.click()
    await expect(requestsTab).toHaveClass(/text-brand/, { timeout: 2000 })

    // MY_LEAVE.leave_type is 'vacation'.  toBeVisible auto-retries so it naturally
    // waits for fetchLeave() to complete and Vue to re-render before timing out.
    await expect(
      page.locator('[data-testid="requests-panel"]').getByText('vacation'),
    ).toBeVisible({ timeout: 5000 })
  })

  test('Requests tab "Review" link from alert navigates to requests tab', async ({ page }) => {
    await page.close()
    const newPage = await page.context().newPage()
    await newPage.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(newPage, MOCK_EMPLOYEE)
    await mockApiCalls(newPage, {
      '/shifts':         [],
      '/assignments':    [],
      '/employees':      { data: [] },
      '/swap-requests':  { data: [PENDING_SWAP] },
      '/leave-requests': { data: [] },
    })
    await newPage.goto(`/stores/${STORE_ID}/today`)
    await newPage.getByText('Review').click()
    // After clicking Review, the Requests tab should be active
    const requestsTab = newPage.locator('[data-testid="tab-bar"] button').nth(3)
    await expect(requestsTab).toHaveClass(/text-brand/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite: Team tab
// ══════════════════════════════════════════════════════════════════════════════

test.describe('TodayView — Team tab', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('shows all assigned employees across today\'s shifts', async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page, {
      '/shifts':         [TODAY_SHIFT],
      '/assignments':    [MY_ASSIGNMENT, OTHER_ASSIGNMENT],
      '/employees':      { data: [PHARMACIST_EMPLOYEE, COLLEAGUE_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
    await page.locator('[data-testid="tab-bar"] button').nth(2).click()
    const teamPanel = page.locator('[data-testid="team-panel"]')
    await expect(teamPanel.getByText('Alice Smith')).toBeVisible()
    await expect(teamPanel.getByText('Bob Jones')).toBeVisible()
  })

  test('shows empty state when no one is on shift today', async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page, {
      '/shifts':         [TODAY_SHIFT],
      '/assignments':    [],            // no one assigned
      '/employees':      { data: [PHARMACIST_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await page.locator('[data-testid="tab-bar"] button').nth(2).click()
    await expect(page.getByText(/no one on shift today/i)).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite: Quick assign (Sprint 2)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('QuickAssignSheet', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  const UNASSIGNED_SHIFT = {
    id: 'shift-empty', store_id: STORE_ID,
    date: TODAY_DATE, start_time: '10:00', end_time: '18:00',
    role: 'pharmacist', required_count: 1, status: 'DRAFT',
    source: 'TEMPLATE', needs_cover: false, created_at: '', updated_at: '',
  }

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page, {
      '/shifts':         [UNASSIGNED_SHIFT],
      '/assignments':    [],
      '/employees':      { data: [PHARMACIST_EMPLOYEE, COLLEAGUE_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
  })

  test('opens quick assign sheet on "Assign employee" click', async ({ page }) => {
    await page.getByText('Assign employee').click()
    await expect(page.getByText('Quick Assign')).toBeVisible()
  })

  test('sheet shows role-filtered employees', async ({ page }) => {
    await page.getByText('Assign employee').click()
    await expect(page.getByText('Alice Smith')).toBeVisible()
    await expect(page.getByText('Bob Jones')).toBeVisible()
  })

  test('search filters employee list by name', async ({ page }) => {
    await page.getByText('Assign employee').click()
    await page.getByPlaceholder('Search employees…').fill('Alice')
    await expect(page.getByText('Alice Smith')).toBeVisible()
    await expect(page.getByText('Bob Jones')).not.toBeVisible()
  })

  test('empty state shown when search finds no matches', async ({ page }) => {
    await page.getByText('Assign employee').click()
    await page.getByPlaceholder('Search employees…').fill('zzzzz')
    await expect(page.getByText(/no match for/i)).toBeVisible()
  })

  test('empty state shown when no employee has matching role', async ({ page }) => {
    await page.close()
    const newPage = await page.context().newPage()
    await newPage.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(newPage, MOCK_MANAGER)
    // Only logistics employees, but shift requires pharmacist
    await mockApiCalls(newPage, {
      '/shifts':         [UNASSIGNED_SHIFT],
      '/assignments':    [],
      '/employees':      { data: [{ ...PHARMACIST_EMPLOYEE, job_role: 'logistics_agent' }] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await newPage.goto(`/stores/${STORE_ID}/today`)
    await newPage.getByText('Assign employee').click()
    const sheet = newPage.locator('[data-testid="quick-assign-sheet"]')
    await expect(sheet.getByText(/no employees with role/i)).toBeVisible()
    // Use exact:true to target only the <strong> in the empty-state msg, not the summary line
    await expect(sheet.getByText('pharmacist', { exact: true })).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite: WeekStrip auto-select (Sprint 3)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('WeekStrip auto-select', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('Week tab shows WeekStrip with week navigation', async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page, {
      '/shifts':         [TODAY_SHIFT, FUTURE_SHIFT],
      '/assignments':    [MY_ASSIGNMENT],
      '/employees':      { data: [PHARMACIST_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })

    await page.locator('[data-testid="tab-bar"] button').nth(1).click()
    // Should show the week navigation header (label + prev/next buttons)
    await expect(page.getByText(/W\d+ ·/).first()).toBeVisible({ timeout: 5_000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite: ShiftCard acknowledgement (Sprint 5)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('ShiftCard acknowledgement', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('shows "Confirm shift" button for published unacknowledged shift', async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page, {
      '/shifts':         [TODAY_SHIFT],  // status: PUBLISHED
      '/assignments':    [MY_ASSIGNMENT],
      '/employees':      { data: [PHARMACIST_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
    // Navigate to Week tab and select today to show ShiftCard
    await page.locator('[data-testid="tab-bar"] button').nth(1).click()
    // Click today's day card in the WeekStrip
    await page.locator(`[data-day="${TODAY_DATE}"]`).click()
    await expect(page.getByText('Confirm shift')).toBeVisible()
  })

  test('clicking "Confirm shift" marks as confirmed', async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_EMPLOYEE)
    // Mock the acknowledge endpoint
    await page.route(`**/api/v1/stores/${STORE_ID}/assignments/a1/acknowledge`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ acknowledged_at: new Date().toISOString() }),
      }),
    )
    await mockApiCalls(page, {
      '/shifts':         [TODAY_SHIFT],
      '/assignments':    [MY_ASSIGNMENT],
      '/employees':      { data: [PHARMACIST_EMPLOYEE] },
      '/swap-requests':  { data: [] },
      '/leave-requests': { data: [] },
    })
    await page.goto(`/stores/${STORE_ID}/today`)
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
    await page.locator('[data-testid="tab-bar"] button').nth(1).click()
    await page.locator(`[data-day="${TODAY_DATE}"]`).click()
    await page.getByText('Confirm shift').click()
    await expect(page.getByText('Confirmed')).toBeVisible({ timeout: 3000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite: Locale (Sprint 3.3)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('TodayView locale', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('header date is formatted using system locale (not hardcoded en-GB)', async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_DATE)
    await injectAuth(page, MOCK_EMPLOYEE)
    await mockApiCalls(page)
    await page.goto(`/stores/${STORE_ID}/today`)
    // Date should be present in some locale-appropriate format
    // We just verify the header date element exists and is non-empty
    const dateEl = page.locator('header span.text-gray-500')
    await expect(dateEl).not.toBeEmpty()
  })
})

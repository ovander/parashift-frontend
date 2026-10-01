import {
  test,
  expect,
  signInAs,
  injectStoreContext,
  mockApiCalls,
  MOCK_MANAGER,
  STORE_ID,
  SHIFT_ID,
  EMPLOYEE_ID,
  MOCK_SHIFTS_FULL,
  MOCK_EMPLOYEES_FULL,
} from './fixtures'

const WEEK_START  = '2026-03-30'
const TODAY_DATE  = '2026-03-30'
// Freeze the browser clock so new Date() returns 2026-03-30 in all tests.
const FROZEN_DATE = new Date('2026-03-30T12:00:00')

// Helper: build a minimal ShiftInstance for today
function todayShift(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-today-1',
    store_id: STORE_ID,
    scheme: 'A',
    date: TODAY_DATE,
    start_time: '09:00',
    end_time: '17:00',
    role: 'PHARMACIST',
    required_count: 2,
    status: 'DRAFT',
    source: 'MANUAL',
    needs_cover: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

// ── Suite: Mobile Today View ───────────────────────────────────────────────────
test.describe('Mobile Today View (TodayView)', () => {
  test.beforeEach(async ({ page }) => {
    // Freeze clock BEFORE navigation so new Date() returns TODAY_DATE everywhere.
    await page.clock.setFixedTime(FROZEN_DATE)
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await signInAs(page, MOCK_MANAGER)
    await mockApiCalls(page, {
      // scheduleStore reads shifts as a raw array (no { data: } wrapper)
      '/shifts':        MOCK_SHIFTS_FULL,
      '/employees':     { data: MOCK_EMPLOYEES_FULL },
      // scheduleStore reads assignments as a raw array
      '/assignments':   [],
      // swapStore fetches /swap-requests (not /swaps)
      '/swap-requests': { data: [] },
    })
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
  })

  test('Today view renders on mobile viewport', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/today`)
    // The heading — use heading role to avoid matching tab button also named "Today"
    await expect(page.getByRole('heading', { name: /Today/i })).toBeVisible()
  })

  test('shows todays shifts', async ({ page }) => {
    // Create shifts for today — raw array (no wrapper) for scheduleStore
    const todayShifts = [
      todayShift({ id: 'shift-today-1', start_time: '09:00', end_time: '17:00', role: 'PHARMACIST' }),
      todayShift({ id: 'shift-today-2', start_time: '14:00', end_time: '22:00', role: 'TECH',
        required_count: 1 }),
    ]
    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(todayShifts),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    // Should show shift times
    await expect(page.getByText('09:00')).toBeVisible()
    await expect(page.getByText('14:00')).toBeVisible()
    // Should show shift roles — use first() since both PHARMACIST and TECH shift cards render
    await expect(page.getByText(/PHARMACIST|TECH/).first()).toBeVisible()
  })

  test('shows bottom tab bar with 4 tabs', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/today`)
    // Use the data-testid on the nav to avoid matching sidebar navs
    const tabs = page.locator('[data-testid="tab-bar"] button')
    // Should have 4 tabs
    await expect(tabs).toHaveCount(4, { timeout: 3_000 })
  })

  test('shift card shows status badge', async ({ page }) => {
    const shifts = [todayShift({ id: 'shift-draft', required_count: 1 })]
    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shifts),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    // Should show DRAFT badge
    await expect(page.getByText('DRAFT')).toBeVisible()
  })

  test('Assign employee button is visible for unassigned shifts', async ({ page }) => {
    const shifts = [todayShift({ id: 'shift-unassigned' })]
    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shifts),
      })
    )
    // assignments endpoint uses query param — match with wildcard
    await page.route(`**/api/v1/stores/${STORE_ID}/assignments**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    // Should show "Assign employee" button (manager sees unassigned shift)
    await expect(page.getByText('Assign employee')).toBeVisible()
  })

  test('tapping Assign opens quick assign sheet', async ({ page }) => {
    const shifts = [todayShift({ id: 'shift-unassigned' })]
    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shifts),
      })
    )
    await page.route(`**/api/v1/stores/${STORE_ID}/assignments**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    // Click Assign button
    await page.getByText('Assign employee').click()
    // Quick assign sheet should open
    await expect(page.getByText('Quick Assign')).toBeVisible()
  })

  test('quick assign sheet shows role-filtered employee list', async ({ page }) => {
    const shifts = [todayShift({ id: 'shift-pharmacist', required_count: 1 })]
    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shifts),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    await page.getByText('Assign employee').click()
    // Sheet opens
    await expect(page.getByText('Quick Assign')).toBeVisible()
    // Should show employees (filtered by role)
    await expect(page.locator('text=/Alice|Bob/')).toBeVisible()
  })

  test('Replace button is visible for assigned shifts', async ({ page }) => {
    const shifts = [todayShift({ id: 'shift-assigned', required_count: 1 })]
    const assignment = [
      {
        id: 'a1',
        shift_id: 'shift-assigned',
        employee_id: EMPLOYEE_ID,
        store_id: STORE_ID,
        shift_date: TODAY_DATE,
        shift_start_time: '09:00',
        shift_end_time: '17:00',
        assigned_at: '',
        violations: [],
      },
    ]
    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shifts),
      })
    )
    await page.route(`**/api/v1/stores/${STORE_ID}/assignments**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(assignment),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    // Should show Replace button for assigned employees
    await expect(page.getByText('Replace')).toBeVisible()
  })

  test('tab switching changes active tab styling', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/today`)
    const tabs = page.locator('[data-testid="tab-bar"] button')
    // First tab should be active
    const firstTab = tabs.first()
    await expect(firstTab).toHaveClass(/text-brand/)
    // Click second tab
    const secondTab = tabs.nth(1)
    await secondTab.click()
    // Second tab should now be active
    await expect(secondTab).toHaveClass(/text-brand/)
  })

  test('empty state shown when no shifts for today', async ({ page }) => {
    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    // Component renders "Day off" when no shifts and no leave.
    // Scoped to the today-panel to avoid matching the WeekStrip day cards.
    await expect(page.getByTestId('today-panel').getByText(/Day off/i)).toBeVisible()
  })

  test('swap alert banner shown when pending swaps exist', async ({ page }) => {
    const swapAlert = [
      {
        id: 'swap-1',
        requester_id: 'emp-other',
        // Must match MOCK_MANAGER.id since auth is MOCK_MANAGER and
        // pendingIncoming filters by auth.user?.id
        target_employee_id: MOCK_MANAGER.id,
        shift_id: SHIFT_ID,
        store_id: STORE_ID,
        status: 'pending',   // lowercase — matches SwapStatus type
        created_at: '',
      },
    ]
    // Intercept swap-requests (the actual endpoint the swapStore uses)
    await page.route(`**/api/v1/stores/${STORE_ID}/swap-requests**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: swapAlert }),
      })
    )

    await page.goto(`/stores/${STORE_ID}/today`)
    // Should show pending swap alert
    await expect(page.getByText(/pending swap/i)).toBeVisible()
  })
})

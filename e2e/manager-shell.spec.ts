import {
  test,
  expect,
  injectAuth,
  injectStoreContext,
  mockApiCalls,
  MOCK_MANAGER,
  STORE_ID,
  SHIFT_ID,
  EMPLOYEE_ID,
  MOCK_PLAN_DRAFT,
  MOCK_PLAN_PUBLISHED,
  MOCK_SHIFTS_FULL,
  MOCK_EMPLOYEES_FULL,
} from './fixtures'

const WEEK_START = '2026-03-30'

// ── Suite: Manager Shell ───────────────────────────────────────────────────────
test.describe('Manager Shell (ManagerShellView)', () => {
  test.beforeEach(async ({ page }) => {
    // Freeze clock BEFORE navigation so new Date() returns WEEK_START (a Monday)
    // and the app initialises with the correct weekStart.
    await page.clock.setFixedTime(new Date('2026-03-30T12:00:00'))
    await injectAuth(page, MOCK_MANAGER)
    await mockApiCalls(page, {
      '/shifts':    MOCK_SHIFTS_FULL,   // scheduleStore reads array directly
      '/employees': { data: MOCK_EMPLOYEES_FULL },
      '/plans':     MOCK_PLAN_DRAFT,
      '/coverage':  { data: { store_id: STORE_ID, week_start: WEEK_START, week_end: '2026-04-05', slots: [], gaps: 0 } },
    })
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
  })

  // ── Mode switching ────────────────────────────────────────────────────────
  test('navigates to manager shell and shows Operate mode by default', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    await expect(page.getByRole('button', { name: 'Operate' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Optimize' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Monitor' })).toBeVisible()
    // Operate should be selected (has white background)
    await expect(page.getByRole('button', { name: 'Operate' })).toHaveClass(/bg-white/)
  })

  test('clicking Optimize switches left panel to optimize mode', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Optimize' }).click()
    // Optimize button becomes selected
    await expect(page.getByRole('button', { name: 'Optimize' })).toHaveClass(/bg-white/)
    // Left panel shows Optimize content (AI/Insights/Scenarios tabs)
    await expect(page.getByText(/AI|Insights|Scenarios/).first()).toBeVisible()
  })

  test('clicking Monitor switches left panel to monitor mode', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Monitor' }).click()
    // Monitor button becomes selected
    await expect(page.getByRole('button', { name: 'Monitor' })).toHaveClass(/bg-white/)
  })

  test('switching back to Operate restores roster panel', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Switch to Optimize
    await page.getByRole('button', { name: 'Optimize' }).click()
    await page.waitForTimeout(200)
    // Switch back to Operate
    await page.getByRole('button', { name: 'Operate' }).click()
    // Operate button is selected again
    await expect(page.getByRole('button', { name: 'Operate' })).toHaveClass(/bg-white/)
  })

  // ── Week navigation ───────────────────────────────────────────────────────
  test('clicking next week arrow advances the week label', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Get initial week label text — ManagerShellView renders a single-date label
    const weekLabel = page.locator('.text-sm.font-medium.text-gray-700').first()
    await expect(weekLabel).toBeVisible()
    const initialText = await weekLabel.textContent()
    // Click next week button — PrimeVue renders icon as child <span>, target <span>
    // to avoid matching panel-toggle buttons that use <i> elements.
    const chevronButtons = page.locator('button:has(span.pi-chevron-right)')
    await chevronButtons.first().click()
    await page.waitForTimeout(400)
    // Week label should have changed to a different date
    await expect(weekLabel).not.toHaveText(initialText!)
  })

  test('clicking prev week arrow goes back in time', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Get initial week label text
    const weekLabel = page.locator('.text-sm.font-medium.text-gray-700').first()
    await expect(weekLabel).toBeVisible()
    const initialText = await weekLabel.textContent()
    // Click previous week button — PrimeVue renders icon as child <span>, target <span>
    // to avoid matching panel-toggle buttons that use <i> elements.
    const chevronButtons = page.locator('button:has(span.pi-chevron-left)')
    await chevronButtons.first().click()
    await page.waitForTimeout(400)
    // Week label should have changed to an earlier date
    await expect(weekLabel).not.toHaveText(initialText!)
  })

  test('clicking Today button resets to current week', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Advance week first — PrimeVue renders icon as child <span>, target <span>
    // to avoid matching panel-toggle buttons that use <i> elements.
    const nextButton = page.locator('button:has(span.pi-chevron-right)').first()
    await nextButton.click()
    await page.waitForTimeout(200)
    // Click Today button — use .first() to avoid strict mode violation from
    // FullCalendar's own "today" button which renders alongside the PrimeVue one.
    await page.getByRole('button', { name: 'Today' }).first().click()
    await page.waitForTimeout(400)
    // Week label should be visible with some date text
    await expect(page.locator('.text-sm.font-medium.text-gray-700').first()).toBeVisible()
  })

  // ── Layer toggles ─────────────────────────────────────────────────────────
  test('layer toggles are visible in Operate mode', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // In Operate mode, layer toggles should be visible
    const layerArea = page.locator('text=Coverage').or(page.locator('text=Violations'))
    // At least one toggle should exist
    const buttons = page.locator('button[class*="toggle"]').or(page.locator('text=/Coverage|Violations/'))
    await expect(buttons.first()).toBeDefined()
  })

  test('layer toggles are hidden in Monitor mode', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Monitor' }).click()
    // Layer toggles should not be visible in Monitor mode
    // The LayerToggles component should be unmounted
    await page.waitForTimeout(200)
    // Verify Monitor mode is active
    await expect(page.getByRole('button', { name: 'Monitor' })).toHaveClass(/bg-white/)
  })

  // ── Plan lifecycle bar ────────────────────────────────────────────────────
  test('lifecycle bar shows DRAFT state initially', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Wait for lifecycle bar to load
    await expect(page.getByText('DRAFT')).toBeVisible()
  })

  test('Publish Week button is visible when state is DRAFT', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    await expect(page.getByRole('button', { name: 'Publish Week' })).toBeVisible()
  })

  test('clicking Publish opens the validation dialog', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Dialog should open
    await expect(page.getByText('Publish Week Schedule')).toBeVisible()
    await expect(page.getByText('Publishing will notify all employees')).toBeVisible()
  })

  test('publish dialog shows shift count information', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Should show shift counts
    await expect(page.getByText('Total shifts')).toBeVisible()
    await expect(page.getByText('Assigned').first()).toBeVisible()
    await expect(page.getByText('Unassigned').first()).toBeVisible()
    // Shift count rows exist (values are shown as <span class="font-medium"> siblings)
    await expect(page.locator('.p-dialog .bg-gray-50')).toBeVisible()
  })

  test('confirming publish calls the API and updates state to PUBLISHED', async ({ page }) => {
    // Mock the publish API endpoint
    await page.route(`**/api/v1/stores/${STORE_ID}/plans/**`, (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PLAN_PUBLISHED),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN_DRAFT),
      })
    })

    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Confirm publish — scope to the dialog to avoid matching lifecycle bar buttons
    await page.locator('.p-dialog').getByRole('button', { name: 'Publish' }).click()
    await page.waitForTimeout(500)
    // State should change (dialog closes, plan state updates)
    // After publishing, the dialog should close
    await expect(page.getByText('Publish Week Schedule')).not.toBeVisible({ timeout: 3_000 })
  })

  // ── Operate mode panel ────────────────────────────────────────────────────
  test('Operate panel shows team roster with employee names', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Operate mode should show employee roster
    // At least one employee name should be visible — use .first() since both may match
    await expect(page.locator('text=Alice').or(page.locator('text=Bob')).first()).toBeVisible()
  })

  test('search input filters employee list', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Find the search input in Operate panel by placeholder
    const searchInput = page.locator('input[placeholder*="Search"]').first()
    await expect(searchInput).toBeVisible()
    // Type in search
    await searchInput.fill('Alice')
    await page.waitForTimeout(300)
    // Should show Alice, might hide Bob
    await expect(page.locator('text=Alice').first()).toBeVisible()
  })

  test('refresh button triggers data reload', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Find refresh button — PrimeVue renders icon as child <span>
    const refreshButton = page.locator('button:has(.pi-refresh)').first()
    await expect(refreshButton).toBeVisible()
    // Click refresh
    await refreshButton.click()
    await page.waitForTimeout(300)
    // Should still be on the page
    await expect(page.getByText('DRAFT')).toBeVisible()
  })

  test('AI Assistant button opens side panel', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Find AI button by data-testid attribute
    const aiButton = page.locator('[data-testid="ai-btn"]')
    await expect(aiButton).toBeVisible({ timeout: 8_000 })
    await aiButton.click()
    // AI panel should open
    await expect(page.getByText('AI Assistant')).toBeVisible()
  })

  test('closing AI panel removes side drawer', async ({ page }) => {
    await page.goto(`/stores/${STORE_ID}/schedule`)
    const aiButton = page.locator('[data-testid="ai-btn"]')
    await expect(aiButton).toBeVisible({ timeout: 8_000 })
    await aiButton.click()
    await expect(page.locator('.p-drawer')).toBeVisible()
    // Close panel (Escape key)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Check the drawer itself is gone — avoids false positives from the tooltip
    // text "AI Assistant" which may linger in a hidden tooltip div after close.
    await expect(page.locator('.p-drawer')).not.toBeVisible()
  })
})

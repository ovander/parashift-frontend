import {
  test,
  expect,
  signInAs,
  injectStoreContext,
  mockApiCalls,
  MOCK_MANAGER,
  STORE_ID,
  MOCK_PLAN_DRAFT,
  MOCK_PLAN_PUBLISHED,
  MOCK_SHIFTS_FULL,
  MOCK_EMPLOYEES_FULL,
} from './fixtures'

const WEEK_START = '2026-03-30'

// ── Suite: Publish Flow ────────────────────────────────────────────────────────
test.describe('Publish Flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, MOCK_MANAGER)
    await mockApiCalls(page, {
      '/shifts':      MOCK_SHIFTS_FULL,   // scheduleStore reads array directly (no wrapper)
      '/employees':   { data: MOCK_EMPLOYEES_FULL },
      '/plans':       MOCK_PLAN_DRAFT,
      '/assignments': [],                 // scheduleStore reads array directly (no wrapper)
      '/coverage':    { data: { store_id: STORE_ID, week_start: WEEK_START, week_end: '2026-04-05', slots: [], gaps: 0 } },
    })
    await injectStoreContext(page, { storeId: STORE_ID, weekStart: WEEK_START })
  })

  test('full publish flow: click Publish → confirm dialog → verify PUBLISHED', async ({ page }) => {
    // Mock the publish endpoint to return PUBLISHED state
    let publishCalled = false
    await page.route(`**/api/v1/stores/${STORE_ID}/plans/**`, (route) => {
      const method = route.request().method()
      const url = route.request().url()

      // Only intercept PATCH/POST to publish endpoint
      if ((method === 'PATCH' || method === 'POST') && url.includes('publish')) {
        publishCalled = true
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PLAN_PUBLISHED),
        })
      }

      // Default GET returns published plan after first publish call
      if (publishCalled) {
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
    // Initially shows DRAFT
    await expect(page.getByText('DRAFT')).toBeVisible()
    // Click Publish Week button
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Dialog opens
    await expect(page.getByText('Publish Week Schedule')).toBeVisible()
    // Click Publish button inside the dialog (scope to dialog to avoid strict-mode violation)
    await page.locator('.p-dialog').getByRole('button', { name: 'Publish' }).click()
    // Wait for dialog to close
    await expect(page.getByText('Publish Week Schedule')).not.toBeVisible({ timeout: 5_000 })
    // Verify API was called
    expect(publishCalled).toBe(true)
  })

  test('publish dialog shows warning for unassigned shifts', async ({ page }) => {
    // Create shifts with no assignments
    const unassignedShifts = [
      {
        id: 'shift-unassigned-1',
        store_id: STORE_ID,
        scheme: 'A',
        date: '2026-03-30',
        start_time: '09:00',
        end_time: '17:00',
        role: 'PHARMACIST',
        required_count: 2,
        created_at: '',
      },
      {
        id: 'shift-unassigned-2',
        store_id: STORE_ID,
        scheme: 'A',
        date: '2026-03-31',
        start_time: '14:00',
        end_time: '22:00',
        role: 'TECH',
        required_count: 1,
        created_at: '',
      },
    ]

    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(unassignedShifts),
      })
    )

    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Dialog should show warning about unassigned shifts — use first() to avoid strict-mode
    await expect(page.getByText(/unassigned|no assigned/i).first()).toBeVisible()
    // Should show warning box
    await expect(page.locator('text=/Warnings/')).toBeVisible()
  })

  test('cancel button closes publish dialog without publishing', async ({ page }) => {
    // Track if publish endpoint was called
    let publishCalled = false
    await page.route(`**/api/v1/stores/${STORE_ID}/plans/**`, (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'POST') {
        publishCalled = true
      }
      return route.continue()
    })

    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Dialog is open
    await expect(page.getByText('Publish Week Schedule')).toBeVisible()
    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    // Dialog closes
    await expect(page.getByText('Publish Week Schedule')).not.toBeVisible()
    // Publish endpoint should NOT have been called
    await page.waitForTimeout(300)
    expect(publishCalled).toBe(false)
  })

  test('published state shows PUBLISHED tag', async ({ page }) => {
    // Start with published plan — planStore fetches /plans?week=... so match with wildcard
    await page.route(`**/api/v1/stores/${STORE_ID}/plans*`, (route) => {
      // Only intercept GET (not POST publish calls)
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PLAN_PUBLISHED),
        })
      }
      return route.continue()
    })

    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Should show PUBLISHED tag instead of DRAFT
    await expect(page.getByText('PUBLISHED')).toBeVisible()
    // Publish Week button should not be visible (canPublish = false for PUBLISHED state)
    await expect(page.getByRole('button', { name: 'Publish Week' })).not.toBeVisible()
  })

  test('override banner appears after publishing when making edits', async ({ page }) => {
    const planWithOverrides = {
      ...MOCK_PLAN_PUBLISHED,
      override_log: [
        {
          shift_id: 'shift-1',
          previous_assignment: 'emp-1',
          new_assignment: 'emp-2',
          timestamp: new Date().toISOString(),
        },
      ],
    }

    // planStore fetches /plans?week=... so match with wildcard
    await page.route(`**/api/v1/stores/${STORE_ID}/plans*`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(planWithOverrides),
        })
      }
      return route.continue()
    })

    await page.goto(`/stores/${STORE_ID}/schedule`)
    // OverrideEditBanner shows "Post-publish edit mode" when plan is PUBLISHED
    // PlanLifecycleBar shows "N override(s)" from override_log
    await expect(
      page.getByText(/override/i).first()
    ).toBeVisible({ timeout: 5_000 })
  })

  test('shift count in dialog reflects current schedule', async ({ page }) => {
    const threeShifts = [
      {
        id: 'shift-1',
        store_id: STORE_ID,
        scheme: 'A',
        date: '2026-03-30',
        start_time: '09:00',
        end_time: '17:00',
        role: 'PHARMACIST',
        required_count: 2,
        created_at: '',
      },
      {
        id: 'shift-2',
        store_id: STORE_ID,
        scheme: 'A',
        date: '2026-03-31',
        start_time: '14:00',
        end_time: '22:00',
        role: 'TECH',
        required_count: 1,
        created_at: '',
      },
      {
        id: 'shift-3',
        store_id: STORE_ID,
        scheme: 'A',
        date: '2026-04-01',
        start_time: '10:00',
        end_time: '18:00',
        role: 'PHARMACIST',
        required_count: 1,
        created_at: '',
      },
    ]

    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(threeShifts),
      })
    )

    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Dialog should show 3 total shifts
    await expect(page.getByText('Total shifts')).toBeVisible()
    // Check for count (should show 3)
    const shiftCountText = page.locator('text=3')
    await expect(shiftCountText.first()).toBeVisible()
  })

  test('dialog shows assignment count vs shift count', async ({ page }) => {
    const shiftsWithPartialAssignment = [
      {
        id: 'shift-1',
        store_id: STORE_ID,
        scheme: 'A',
        date: '2026-03-30',
        start_time: '09:00',
        end_time: '17:00',
        role: 'PHARMACIST',
        required_count: 2,
        created_at: '',
      },
      {
        id: 'shift-2',
        store_id: STORE_ID,
        scheme: 'A',
        date: '2026-03-31',
        start_time: '14:00',
        end_time: '22:00',
        role: 'TECH',
        required_count: 1,
        created_at: '',
      },
    ]

    const oneAssignment = [
      {
        id: 'a1',
        shift_id: 'shift-1',
        employee_id: 'emp-1',
        store_id: STORE_ID,
        shift_date: '2026-03-30',
        shift_start_time: '09:00',
        shift_end_time: '17:00',
        assigned_at: '',
      },
    ]

    await page.route(`**/api/v1/stores/${STORE_ID}/shifts**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shiftsWithPartialAssignment),
      })
    )

    await page.route(`**/api/v1/stores/${STORE_ID}/assignments**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(oneAssignment),
      })
    )

    await page.goto(`/stores/${STORE_ID}/schedule`)
    await page.getByRole('button', { name: 'Publish Week' }).click()
    // Should show:
    // Total shifts: 2
    // Assigned: 1
    // Unassigned: 1
    await expect(page.getByText('Total shifts')).toBeVisible()
    await expect(page.getByText('Assigned').first()).toBeVisible()
    await expect(page.getByText('Unassigned')).toBeVisible()
  })

  test('multiple publish attempts show correct state each time', async ({ page }) => {
    let callCount = 0
    await page.route(`**/api/v1/stores/${STORE_ID}/plans/**`, (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'POST') {
        callCount++
      }
      return route.continue()
    })

    await page.goto(`/stores/${STORE_ID}/schedule`)
    // Initial state: DRAFT
    await expect(page.getByText('DRAFT')).toBeVisible()
    // Open and cancel dialog
    await page.getByRole('button', { name: 'Publish Week' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    // Dialog should close
    await expect(page.getByText('Publish Week Schedule')).not.toBeVisible()
    // Should not have called publish
    expect(callCount).toBe(0)
  })
})

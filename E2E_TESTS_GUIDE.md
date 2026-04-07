# ParaShift Frontend E2E Test Suite

Comprehensive Playwright E2E tests for the ParaShift scheduling management system.

## Test Files Overview

### 1. `e2e/manager-shell.spec.ts` (19 tests)
Tests for the main manager scheduling interface (`ManagerShellView`).

**Categories:**
- **Mode Switching** - Operate/Optimize/Monitor panel transitions
- **Week Navigation** - Previous/Next week and Today button
- **Layer Toggles** - Coverage/Violations visibility per mode
- **Plan Lifecycle** - DRAFT to PUBLISHED state transitions
- **Operate Panel** - Roster display and search
- **AI Panel** - AI Assistant drawer open/close

**Key Tests:**
- Mode buttons switch active panel correctly
- Week navigation updates displayed week
- Publish dialog shows shift counts
- API call confirms publish updates state

### 2. `e2e/mobile-today.spec.ts` (11 tests)
Tests for mobile-optimized Today view (`TodayView`) at 375x812 viewport.

**Categories:**
- **Viewport Rendering** - Mobile layout display
- **Shift Display** - Today's shifts, status badges
- **Assignment Management** - Assign/Replace buttons
- **Quick Assign** - Bottom sheet for role-filtered employee selection
- **Tab Navigation** - Mobile tab bar switching
- **Empty States** - No shifts, pending swaps alerts

**Key Tests:**
- Mobile viewport renders correctly
- Assign button opens quick assign sheet
- Replace button appears for assigned shifts
- Swap alert banner shows when pending

### 3. `e2e/publish-flow.spec.ts` (8 tests)
Detailed publish workflow tests covering dialog validation and state transitions.

**Categories:**
- **Complete Flow** - Full publish sequence with API verification
- **Dialog Validation** - Warnings for unassigned shifts, count verification
- **State Management** - PUBLISHED tag display, override banner
- **Data Consistency** - Shift/assignment counts accuracy

**Key Tests:**
- Full publish flow: Click → Dialog → Confirm → State change
- Cancel closes dialog without API call
- Unassigned shift warnings display
- Override banner appears for edited published plans

### 4. `e2e/fixtures.ts` (Extended)
Shared test utilities and mock data.

**Exports:**
- `injectAuth()` - Set up authenticated user
- `mockApiCalls()` - Mock /api/v1/** endpoints
- `injectStoreContext()` - Pre-seed Pinia store state
- `MOCK_MANAGER`, `MOCK_EMPLOYEE` - Test user constants
- `MOCK_PLAN_DRAFT`, `MOCK_PLAN_PUBLISHED` - Plan state fixtures
- `MOCK_SHIFTS_FULL`, `MOCK_EMPLOYEES_FULL` - Schedule data

## Setup & Configuration

### Prerequisites
- Node.js 16+
- Vite dev server capability
- Playwright installed (included in `package.json`)

### Config
- **Base URL:** `http://localhost:4173` (Vite preview)
- **Web Server:** Auto-starts `vite build && npm run preview`
- **Viewport:** Desktop (1280x720) by default
- **Timeouts:** 15s navigation, 10s actions
- **Trace:** Captured on first retry

## Running Tests

```bash
# List all tests
npx playwright test --list

# Run all tests
npx playwright test

# Run specific file
npx playwright test e2e/manager-shell.spec.ts

# Run specific test by name
npx playwright test -g "mode switching"

# Debug mode (opens inspector)
npx playwright test --debug

# UI mode (interactive browser)
npx playwright test --ui

# Generate HTML report
npx playwright test && npx playwright show-report
```

## Test Patterns

### 1. Authentication
All tests start with authenticated user:
```typescript
test.beforeEach(async ({ page }) => {
  await injectAuth(page, MOCK_MANAGER)
})
```

### 2. API Mocking
Mock endpoints before navigation:
```typescript
await mockApiCalls(page, {
  '/shifts': { data: MOCK_SHIFTS_FULL },
  '/plans': MOCK_PLAN_DRAFT,
})
```

Override specific routes:
```typescript
await page.route(`**/api/v1/stores/${STORE_ID}/plans/**`, (route) => {
  if (route.request().method() === 'PATCH') {
    return route.fulfill({ status: 200, body: JSON.stringify(MOCK_PLAN_PUBLISHED) })
  }
})
```

### 3. Navigation & Interaction
```typescript
await page.goto(`/stores/${STORE_ID}/schedule`)
await page.getByRole('button', { name: 'Publish Week' }).click()
```

### 4. Assertions
```typescript
await expect(page.getByText('DRAFT')).toBeVisible()
await expect(page.getByRole('button', { name: 'Operate' })).toHaveClass(/bg-white/)
```

### 5. Mobile Testing
```typescript
await page.setViewportSize({ width: 375, height: 812 })
```

### 6. Store State Injection
```typescript
await injectStoreContext(page, {
  storeId: STORE_ID,
  weekStart: '2026-03-30'
})
```

## Architecture Notes

### Auth Flow
1. Test injects `window.__E2E_AUTH__` via `addInitScript()`
2. Auth store reads tokens from injected object
3. Router sees authenticated state, allows navigation
4. No real OAuth flow needed

### API Mocking
1. `page.route()` intercepts all `/api/v1/**` calls
2. Tests can override specific endpoints
3. Default responses for common endpoints
4. Support for method-based routing (GET vs PATCH)

### State Management
- Pinia stores automatically hydrate from API mocks
- `injectStoreContext()` pre-seeds store for faster tests
- Reduces race conditions in navigation/loading

## Common Issues & Solutions

### Test Timeout
- Increase timeout: `test.setTimeout(30000)`
- Check network mock setup
- Verify API routes are properly mocked

### Flaky Navigation
- Use `injectStoreContext()` before goto
- Add `page.waitForLoadState('networkidle')`
- Ensure all API calls are mocked

### Dialog Not Appearing
- Check that parent component is rendered
- Verify button click targets correct element
- Check for CSS animations blocking visibility

### Mobile Tests Failing
- Set viewport size BEFORE authentication
- Verify responsive classes in assertions
- Check for mobile-specific element selectors

## CI/CD Integration

Tests are configured for GitHub Actions:
```yaml
retries: process.env.CI ? 2 : 0
workers: process.env.CI ? 1 : undefined
reporter: process.env.CI ? 'github' : 'list'
```

Set `CI=true` environment variable to enable CI mode.

## Test Statistics

- **Total Tests:** 77 (38 new + 39 existing)
- **Coverage Areas:**
  - Manager scheduling interface: 19 tests
  - Mobile today view: 11 tests
  - Publish workflow: 8 tests
  - Planner/Coverage/Leave/Admin: 39 tests

## File Paths

```
/sessions/happy-eloquent-albattani/mnt/parashift/frontend/
├── e2e/
│   ├── fixtures.ts                 (shared utilities & mock data)
│   ├── manager-shell.spec.ts       (19 manager shell tests)
│   ├── mobile-today.spec.ts        (11 mobile today tests)
│   ├── publish-flow.spec.ts        (8 publish flow tests)
│   └── planner.spec.ts             (39 existing tests)
├── playwright.config.ts            (already configured)
└── src/
    ├── stores/auth.ts              (has E2E auth support)
    ├── router/index.ts             (auth guard)
    └── features/schedule/views/
        ├── ManagerShellView.vue
        └── TodayView.vue
```

## Next Steps

1. Run tests locally: `npx playwright test`
2. View interactive UI: `npx playwright test --ui`
3. Debug failing tests: `npx playwright test --debug`
4. Generate report: `npx playwright show-report`
5. Add to CI/CD pipeline with `CI=true npm test`

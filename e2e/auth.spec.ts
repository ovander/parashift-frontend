/**
 * E2E — Authentication through the backend's Backend-for-Frontend (BFF).
 *
 * Sign-in runs on the backend: the SPA navigates to /bff/login, the backend
 * sends the browser to Socrate, Socrate back to /bff/callback, and the backend
 * sets an HttpOnly session cookie and returns to the page. Here a fake BFF and
 * a fake issuer play those parts with page.route(); no backend or identity
 * provider is reached, and nothing in the app is bypassed.
 */

import { test, expect, type Page, type Request } from '@playwright/test'
import { mockApiCalls, MOCK_MANAGER, STORE_ID } from './fixtures'

// The fake issuer lives on the app's origin: where Socrate is does not matter
// to the SPA (the backend redirects there), and a cross-origin https host
// would put the browser's TLS and network rules into the test.
const ISSUER_PATH = '/__fake-issuer'
const CSRF = 'csrf-from-the-bff'
const PLANNER = `/stores/${STORE_ID}/planner`

/**
 * A page that sends the browser on to url. The real backend answers 302; a
 * mocked 302 would not do here, because the request a fulfilled redirect leads
 * to bypasses page.route() and reaches the preview server.
 */
function goOn(url: string) {
  return { contentType: 'text/html', body: `<html><body><script>location.replace(${JSON.stringify(url)})</script></body></html>` }
}

/**
 * A fake BFF and issuer. /bff/login sends the browser to the issuer's
 * /oauth/authorize (keeping return_to), the issuer to /bff/callback, and the
 * callback starts the session and returns to the page. GET /api/v1/me answers
 * with the profile once signed in (404 when profile is null: no employee yet).
 * Every request the app makes is recorded.
 */
async function fakeBff(page: Page, opts: { signedIn?: boolean; profile?: object | null } = {}) {
  const state = { signedIn: opts.signedIn ?? false, logins: [] as URL[], requests: [] as Request[], logouts: [] as Request[] }
  const profile = opts.profile === undefined ? MOCK_MANAGER : opts.profile
  page.on('request', r => state.requests.push(r))

  await page.route('**/api/v1/me', route => !state.signedIn
    ? route.fulfill({ status: 401, json: { error: { code: 'UNAUTHORIZED', message: 'authentication required' } } })
    : profile
      ? route.fulfill({ json: profile })
      : route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'employee not found' } } }))
  await page.route('**/bff/session', route => route.fulfill({
    headers: { 'Cache-Control': 'no-store' },
    json: state.signedIn
      ? { authenticated: true, user: { sub: '42', email: MOCK_MANAGER.email, name: MOCK_MANAGER.name }, csrf: CSRF }
      : { authenticated: false },
  }))
  await page.route('**/bff/login**', (route) => {
    const url = new URL(route.request().url())
    state.logins.push(url)
    const authorize = new URL(`${url.origin}${ISSUER_PATH}/oauth/authorize`)
    authorize.searchParams.set('response_type', 'code')
    authorize.searchParams.set('state', 'state-1')
    authorize.searchParams.set('code_challenge_method', 'S256')
    authorize.searchParams.set('redirect_uri', `${url.origin}/bff/callback`)
    authorize.searchParams.set('return_to', url.searchParams.get('return_to') ?? '/') // carried for the fake only
    return route.fulfill(goOn(authorize.toString()))
  })
  await page.route(`**${ISSUER_PATH}/**`, (route) => {
    const authorize = new URL(route.request().url())
    const callback = new URL(authorize.searchParams.get('redirect_uri')!)
    callback.searchParams.set('code', 'code-1')
    callback.searchParams.set('state', authorize.searchParams.get('state')!)
    callback.searchParams.set('rt', authorize.searchParams.get('return_to')!)
    // The user signs in at the issuer, which then sends the browser back.
    return route.fulfill(goOn(callback.toString()))
  })
  await page.route('**/bff/callback**', (route) => {
    const url = new URL(route.request().url())
    state.signedIn = true
    return route.fulfill(goOn(url.searchParams.get('rt') ?? '/'))
  })
  await page.route('**/bff/logout', (route) => {
    state.logouts.push(route.request())
    state.signedIn = false
    return route.fulfill({ status: 204 })
  })
  return state
}

async function expectNoAuthInBrowserStorage(page: Page) {
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(stored).not.toContain(CSRF)
  expect(stored).not.toMatch(/token|verifier|state|session/i)
}

const logoutButton = (page: Page) => page.locator('[data-test="logout"]:visible').first()

test.describe('Sign-in through the BFF', () => {
  test('a signed-out visit to a page goes to /login with the page to come back to', async ({ page }) => {
    await mockApiCalls(page) // before fakeBff: the routes registered last win
    await fakeBff(page)

    await page.goto(PLANNER)

    await page.waitForURL(url => url.pathname === '/login')
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(PLANNER)
  })

  test('sign-in comes back to the page that asked for it', async ({ page }) => {
    await mockApiCalls(page)
    const bff = await fakeBff(page)

    // Every step of the round trip, for the failure message.
    const trail: string[] = []
    page.on('framenavigated', f => { if (f === page.mainFrame()) trail.push(`nav ${f.url()}`) })
    page.on('pageerror', e => trail.push(`pageerror ${e.message}`))

    await page.goto(`/login?redirect=${encodeURIComponent(PLANNER)}`)
    await page.locator('[data-test="login-button"]').click()

    try {
      await expect.poll(() => bff.logins.length).toBe(1)
      expect(bff.logins[0].searchParams.get('return_to')).toBe(PLANNER)
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(PLANNER)
    } catch (e) {
      throw new Error(`${(e as Error).message}\n--- trail ---\n${trail.join('\n')}`, { cause: e })
    }
    await expect(logoutButton(page)).toBeVisible()
    await expectNoAuthInBrowserStorage(page)
  })

  test('the login page never sends the browser to another origin', async ({ page }) => {
    const bff = await fakeBff(page)

    await page.goto('/login?redirect=//evil.test/x')
    await page.locator('[data-test="login-button"]').click()

    await expect.poll(() => bff.logins.length).toBe(1)
    expect(bff.logins[0].searchParams.get('return_to')).toBe('/')
  })

  test('API calls are same-origin, never carry a bearer, and send the CSRF token on unsafe methods', async ({ page, baseURL }) => {
    await mockApiCalls(page)
    const bff = await fakeBff(page, { signedIn: true })

    await page.goto(PLANNER)
    await expect(logoutButton(page)).toBeVisible()
    await logoutButton(page).click()
    await page.waitForURL(url => url.pathname === '/login')

    const origin = new URL(baseURL!).origin
    const xhr = bff.requests.filter(r => ['xhr', 'fetch'].includes(r.resourceType()))
    expect(xhr.length).toBeGreaterThan(2)
    for (const r of xhr) {
      expect(new URL(r.url()).origin, r.url()).toBe(origin)
      expect(await r.headerValue('authorization'), r.url()).toBeNull()
    }
    expect(bff.logouts).toHaveLength(1)
    expect(await bff.logouts[0].headerValue('x-csrf-token')).toBe(CSRF)
    for (const r of xhr.filter(r => r.method() !== 'GET' && r.method() !== 'HEAD')) {
      expect(await r.headerValue('x-csrf-token'), r.url()).toBe(CSRF)
    }
    await expectNoAuthInBrowserStorage(page)
  })

  test('a lost session (401) re-checks /bff/session and signs in again to the same page', async ({ page }) => {
    await mockApiCalls(page)
    const bff = await fakeBff(page, { signedIn: true })
    await page.goto(PLANNER)
    await expect(logoutButton(page)).toBeVisible()

    // The session ends on the server (idle timeout, refresh rejected).
    bff.signedIn = false
    await page.route('**/api/v1/stores/**', route => route.fulfill({ status: 401, json: { error: { code: 'UNAUTHORIZED', message: 'authentication required' } } }))
    const today = `/stores/${STORE_ID}/today`
    // The sign-in navigation may start before evaluate returns.
    await page.evaluate(p => (document.querySelector('#app') as any).__vue_app__.config.globalProperties.$router.push(p), today).catch(() => {})

    await expect.poll(() => bff.logins.length).toBeGreaterThan(0)
    expect(bff.logins[0].searchParams.get('return_to')).toBe(today)
  })

  test('a sign-in the backend refused shows why, without looping back to Socrate', async ({ page }) => {
    const bff = await fakeBff(page)

    await page.goto('/login?error=sign_in_failed')

    await expect(page.locator('[data-test="login-error"]')).toBeVisible()
    await page.waitForTimeout(300)
    expect(bff.logins).toHaveLength(0)
    await page.locator('[data-test="login-button"]').click()
    await expect.poll(() => bff.logins.length).toBe(1)
  })

  test('a Socrate account without a Parashift employee is told to use its invite', async ({ page }) => {
    await mockApiCalls(page)
    const bff = await fakeBff(page, { signedIn: true, profile: null })

    await page.goto(PLANNER)

    await page.waitForURL(url => url.pathname === '/login')
    expect(new URL(page.url()).searchParams.get('error')).toBe('no_account')
    await expect(page.locator('[data-test="login-error"]')).toBeVisible()
    expect(bff.logins).toHaveLength(0)
  })
})

test.describe('Invite claim through the BFF', () => {
  test('signing in from an invite link comes back to it and claims it', async ({ page }) => {
    await mockApiCalls(page)
    const claims: Request[] = []
    let claimed = false
    const bff = await fakeBff(page, { profile: MOCK_MANAGER })
    // Before the claim the account has no employee; after, it is the manager.
    await page.route('**/api/v1/me', route => claimed
      ? route.fulfill({ json: MOCK_MANAGER })
      : route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'employee not found' } } }))
    await page.route('**/api/v1/claim/**', (route) => {
      claims.push(route.request())
      claimed = true
      return route.fulfill({ json: { ok: true } })
    })

    await page.goto('/claim/invite-123')
    await page.getByRole('button', { name: /sign in to activate/i }).click()

    await expect.poll(() => bff.logins.length).toBe(1)
    expect(bff.logins[0].searchParams.get('return_to')).toBe('/claim/invite-123')
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(PLANNER)
    expect(claims).toHaveLength(1)
    expect(new URL(claims[0].url()).pathname).toBe('/api/v1/claim/invite-123')
    expect(await claims[0].headerValue('x-csrf-token')).toBe(CSRF)
    await expectNoAuthInBrowserStorage(page)
  })
})

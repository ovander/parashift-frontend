import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import { useAuthStore, loginUrl } from '@/stores/auth'

const SESSION = { authenticated: true, user: { sub: '42', email: 'a@b.test', name: 'A' }, csrf: 'csrf-1' }
const ME = { id: 'u1', name: 'A', position: 'manager', store_id: 's1' }

function answer(routes: Record<string, unknown | Error>) {
  return vi.spyOn(axios, 'get').mockImplementation(async (url: string) => {
    const r = routes[url]
    if (r instanceof Error) throw r
    if (r === undefined) throw new Error(`unexpected GET ${url}`)
    return { data: r }
  })
}

describe('auth store (BFF session)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('location', { ...window.location, assign: vi.fn() })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('builds the /bff/login URL with an encoded return path', () => {
    expect(loginUrl('/claim/a b?x=1')).toBe('/bff/login?return_to=%2Fclaim%2Fa%20b%3Fx%3D1')
    expect(loginUrl()).toBe('/bff/login?return_to=%2F')
  })

  it('a session with a CSRF token signs in and loads the profile', async () => {
    const get = answer({ '/bff/session': SESSION, '/api/v1/me': ME })
    const auth = useAuthStore()
    expect(await auth.ensureSession()).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.csrf).toBe('csrf-1')
    expect(auth.user).toEqual(ME)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('no session, or one without a CSRF token, is signed out', async () => {
    for (const body of [{ authenticated: false }, { authenticated: true }, { authenticated: true, csrf: '' }, null]) {
      setActivePinia(createPinia())
      answer({ '/bff/session': body })
      const auth = useAuthStore()
      expect(await auth.ensureSession()).toBe(false)
      expect(auth.csrf).toBeNull()
      expect(auth.user).toBeNull()
    }
  })

  it('a failed session check is signed out, not an error', async () => {
    answer({ '/bff/session': new Error('network') })
    const auth = useAuthStore()
    expect(await auth.ensureSession()).toBe(false)
    expect(auth.checked).toBe(true)
  })

  it('a profile that does not load keeps the session (no employee record yet)', async () => {
    answer({ '/bff/session': SESSION, '/api/v1/me': new Error('404') })
    const auth = useAuthStore()
    expect(await auth.ensureSession()).toBe(true)
    expect(auth.user).toBeNull()
  })

  it('asks /bff/session once per page load, sharing concurrent calls', async () => {
    const get = answer({ '/bff/session': { authenticated: false } })
    const auth = useAuthStore()
    await Promise.all([auth.ensureSession(), auth.ensureSession()])
    await auth.ensureSession()
    expect(get).toHaveBeenCalledTimes(1)
    await auth.recheckSession()
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('login navigates to the backend', () => {
    useAuthStore().login('/stores/s1/planner')
    expect(window.location.assign).toHaveBeenCalledWith('/bff/login?return_to=%2Fstores%2Fs1%2Fplanner')
  })

  it('logout posts the CSRF token and clears the state, even when the call fails', async () => {
    answer({ '/bff/session': SESSION, '/api/v1/me': ME })
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new Error('down'))
    const auth = useAuthStore()
    await auth.ensureSession()
    await auth.logout()
    expect(post).toHaveBeenCalledWith('/bff/logout', null, { headers: { 'X-CSRF-Token': 'csrf-1' } })
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('logout without a session makes no call', async () => {
    const post = vi.spyOn(axios, 'post')
    await useAuthStore().logout()
    expect(post).not.toHaveBeenCalled()
  })

  it('updateLocale sends the CSRF token', async () => {
    answer({ '/bff/session': SESSION, '/api/v1/me': ME })
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: {} })
    const auth = useAuthStore()
    await auth.ensureSession()
    await auth.updateLocale('fr')
    expect(patch).toHaveBeenCalledWith('/api/v1/me/locale', { locale: 'fr' }, { headers: { 'X-CSRF-Token': 'csrf-1' } })
    expect(auth.user?.locale).toBe('fr')
  })
})

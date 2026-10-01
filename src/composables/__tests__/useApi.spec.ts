import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import api, { isAbsoluteUrl, useAIApi } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'

type Reply = (config: InternalAxiosRequestConfig) => Partial<AxiosResponse> & { status: number }

const seen: InternalAxiosRequestConfig[] = []

/** Answers the instance's requests with reply, recording each one. */
function serve(reply: Reply) {
  api.defaults.adapter = async (config) => {
    seen.push(config)
    const r = reply(config)
    const response = { data: r.data ?? {}, status: r.status, statusText: '', headers: {}, config } as AxiosResponse
    if (r.status >= 400) throw new AxiosError('failed', String(r.status), config, null, response)
    return response
  }
}

describe('useApi (same-origin, BFF session)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    seen.length = 0
    vi.stubGlobal('location', { ...window.location, assign: vi.fn(), pathname: '/stores/s1/planner', search: '?w=1', hash: '' })
    useAuthStore().csrf = 'csrf-1'
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('recognises absolute URLs', () => {
    expect(isAbsoluteUrl('https://x.test/a')).toBe(true)
    expect(isAbsoluteUrl('//x.test/a')).toBe(true)
    expect(isAbsoluteUrl('/api/v1/me')).toBe(false)
    expect(isAbsoluteUrl(undefined)).toBe(false)
  })

  it('refuses a cross-origin request', async () => {
    serve(() => ({ status: 200 }))
    await expect(api.get('https://evil.test/api')).rejects.toThrow(/cross-origin/)
    expect(seen).toHaveLength(0)
  })

  it('drops any Authorization header and sends CSRF on unsafe methods only', async () => {
    serve(() => ({ status: 200 }))
    await api.get('/api/v1/stores/me', { headers: { Authorization: 'Bearer x' } })
    await api.post('/api/v1/leave', {})
    await api.delete('/api/v1/leave/1')
    const h = (i: number) => AxiosHeaders.from(seen[i].headers)
    expect(h(0).has('Authorization')).toBe(false)
    expect(h(0).get('X-CSRF-Token')).toBeUndefined()
    expect(h(1).get('X-CSRF-Token')).toBe('csrf-1')
    expect(h(2).get('X-CSRF-Token')).toBe('csrf-1')
    expect(seen[0].withCredentials).toBe(false)
  })

  it('every instance is same-origin', () => {
    expect(useAIApi().defaults.baseURL).toBe('')
    expect(useAIApi().defaults.timeout).toBe(120_000)
  })

  it('a 401 re-checks the session and, without one, signs in again to this page', async () => {
    serve(() => ({ status: 401 }))
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { authenticated: false } })
    await expect(api.get('/api/v1/me/schedule')).rejects.toBeInstanceOf(AxiosError)
    expect(window.location.assign).toHaveBeenCalledWith('/bff/login?return_to=%2Fstores%2Fs1%2Fplanner%3Fw%3D1')
  })

  it('a 401 with the session still there does not sign in again', async () => {
    serve(() => ({ status: 401 }))
    vi.spyOn(axios, 'get').mockImplementation(async (url: string) =>
      ({ data: url === '/bff/session' ? { authenticated: true, csrf: 'csrf-1' } : { id: 'u', name: 'A', position: 'manager' } }))
    await expect(api.get('/api/v1/me/schedule')).rejects.toBeInstanceOf(AxiosError)
    expect(window.location.assign).not.toHaveBeenCalled()
  })

  it('a stale CSRF token is refreshed and the request retried once', async () => {
    serve((c) => AxiosHeaders.from(c.headers).get('X-CSRF-Token') === 'csrf-2'
      ? { status: 200, data: { ok: true } }
      : { status: 403, data: { error: { message: 'missing or invalid CSRF token' } } })
    vi.spyOn(axios, 'get').mockImplementation(async (url: string) =>
      ({ data: url === '/bff/session' ? { authenticated: true, csrf: 'csrf-2' } : { id: 'u', name: 'A', position: 'manager' } }))
    const res = await api.post('/api/v1/leave', {})
    expect(res.data).toEqual({ ok: true })
    expect(seen).toHaveLength(2)
  })

  it('a CSRF refusal that persists is not retried forever', async () => {
    serve(() => ({ status: 403, data: { error: { message: 'missing or invalid CSRF token' } } }))
    vi.spyOn(axios, 'get').mockImplementation(async (url: string) =>
      ({ data: url === '/bff/session' ? { authenticated: true, csrf: 'csrf-1' } : { id: 'u', name: 'A', position: 'manager' } }))
    await expect(api.post('/api/v1/leave', {})).rejects.toBeInstanceOf(AxiosError)
    expect(seen).toHaveLength(2)
  })
})

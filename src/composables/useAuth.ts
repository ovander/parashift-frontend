import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Sign-in state and actions for components. Sign-in itself runs on the
 * backend (BFF): login() navigates to /bff/login, which sends the browser to
 * Socrate and back with a session cookie (see src/stores/auth.ts).
 */
export function useAuth() {
  const store = useAuthStore()

  const isAuthenticated = computed(() => store.isAuthenticated)
  const user            = computed(() => store.user)
  const isManager       = computed(() => store.user?.position === 'manager')
  const isEmployee      = computed(() => store.user?.position === 'employee')
  const isAdmin         = computed(() => store.user?.position === 'admin')

  function login(returnTo = '/') { store.login(returnTo) }
  async function logout() { await store.logout() }

  return { isAuthenticated, user, isManager, isEmployee, isAdmin, login, logout }
}

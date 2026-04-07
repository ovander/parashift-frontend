<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-brand-500 mb-4 block" />
      <p class="text-gray-500">Completing sign-in…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import api from '@/composables/useApi'

const route  = useRoute()
const router = useRouter()
const auth   = useAuth()
const authStore = useAuthStore()

onMounted(async () => {
  const code  = route.query.code  as string
  const state = route.query.state as string
  try {
    await auth.handleCallback(code, state)

    // Check whether the login was triggered from an invite link.
    const pendingToken = sessionStorage.getItem('pending_claim_token')
    if (pendingToken) {
      sessionStorage.removeItem('pending_claim_token')
      try {
        await api.post(`/api/v1/claim/${pendingToken}`, {})
        // Refresh profile to get the newly-bound employee's store_id / role.
        await authStore.fetchMe()
      } catch {
        // Claim failed (expired / already used) — continue with normal routing.
      }
    }

    const user = authStore.user
    if (user?.position === 'manager' && user.store_id) {
      router.push(`/stores/${user.store_id}/planner`)
    } else if (user?.position === 'employee' && user.store_id) {
      router.push(`/stores/${user.store_id}/my-week`)
    } else {
      router.push('/admin')
    }
  } catch {
    router.push('/login')
  }
})
</script>

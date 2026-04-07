<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-6">
          <img src="/logo.png" alt="ParaShift" class="h-10 w-auto" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">You've been invited</h1>
        <p class="text-gray-500 mt-2 text-sm">
          Sign in with your Socrate account to activate your ParaShift account.
        </p>
      </div>

      <Card class="shadow-xl">
        <template #content>
          <div v-if="claiming" class="flex flex-col items-center gap-3 py-4">
            <i class="pi pi-spin pi-spinner text-2xl text-brand-500" />
            <p class="text-sm text-gray-500">Activating your account…</p>
          </div>
          <div v-else-if="error" class="flex flex-col items-center gap-3 py-4">
            <i class="pi pi-times-circle text-2xl text-red-500" />
            <p class="text-sm text-red-600">{{ error }}</p>
            <Button label="Go to login" text size="small" @click="router.push('/login')" />
          </div>
          <Button
            v-else
            label="Sign in to activate"
            icon="pi pi-sign-in"
            fluid
            size="large"
            :loading="loading"
            @click="startLogin"
          />
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import api from '@/composables/useApi'

const route  = useRoute()
const router = useRouter()
const auth   = useAuth()
const authStore = useAuthStore()

const loading  = ref(false)
const claiming = ref(false)
const error    = ref('')

const token = route.params.token as string

onMounted(async () => {
  if (!token) {
    error.value = 'Invalid invite link.'
    return
  }

  // If the user is already authenticated, claim immediately without a redirect.
  if (authStore.isAuthenticated) {
    await claimNow()
  }
  // Otherwise, the user will click "Sign in to activate" to initiate the login flow.
})

async function startLogin() {
  loading.value = true
  // Persist the token so CallbackView can pick it up after auth.
  sessionStorage.setItem('pending_claim_token', token)
  await auth.initiateLogin()
}

async function claimNow() {
  claiming.value = true
  try {
    await api.post(`/api/v1/claim/${token}`, {})
    // Refresh the user profile so store_id / role are up-to-date.
    await authStore.fetchMe()
    const user = authStore.user
    if (user?.position === 'manager' && user.store_id) {
      router.push(`/stores/${user.store_id}/planner`)
    } else if (user?.position === 'employee' && user.store_id) {
      router.push(`/stores/${user.store_id}/my-week`)
    } else {
      router.push('/')
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? 'Invalid or expired invite link.'
    error.value = msg
    claiming.value = false
  }
}
</script>

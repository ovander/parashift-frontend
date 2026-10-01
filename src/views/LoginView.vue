<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-6">
          <img src="/logo.png" alt="ParaShift" class="h-10 w-auto" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('auth.loginTitle') }}</h1>
        <p class="text-gray-500 mt-2 text-sm">{{ t('auth.loginSubtitle') }}</p>
      </div>

      <Card class="shadow-xl">
        <template #content>
          <Message v-if="errorKey" severity="error" class="mb-4" data-test="login-error">{{ t(errorKey) }}</Message>
          <Button
            :label="t('auth.loginButton')"
            icon="pi pi-sign-in"
            fluid
            size="large"
            :loading="loading"
            data-test="login-button"
            @click="login"
          />
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import { useAuth } from '@/composables/useAuth'

const { t }   = useI18n()
const route   = useRoute()
const auth    = useAuth()
const loading = ref(false)

// The backend sends a refused sign-in back here with ?error= (bff_handler.go);
// the router sends a signed-in Socrate account without an employee record
// with ?error=no_account.
const ERRORS: Record<string, string> = {
  access_denied:  'auth.errorAccessDenied',
  no_account:     'auth.errorNoAccount',
  sign_in_failed: 'auth.errorSignInFailed',
}
const errorKey = computed(() => {
  const e = route.query.error
  if (typeof e !== 'string' || e === '') return null
  return ERRORS[e] ?? ERRORS.sign_in_failed
})

/** The page to open after sign-in: a path on this site, never another origin. */
function returnTo(): string {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/'
}

function login() {
  loading.value = true
  auth.login(returnTo())
}
</script>

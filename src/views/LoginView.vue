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
          <Button
            :label="t('auth.loginButton')"
            icon="pi pi-sign-in"
            fluid
            size="large"
            :loading="loading"
            @click="login"
          />
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useAuth } from '@/composables/useAuth'

const { t }   = useI18n()
const auth    = useAuth()
const loading = ref(false)

async function login() {
  loading.value = true
  await auth.initiateLogin()
}
</script>

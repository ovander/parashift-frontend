<template>
  <RouterView />
  <Toast />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePrimeVue } from 'primevue/config'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useUiStore } from '@/stores/ui'
import { loadLocaleMessages, type Locale } from '@/plugins/i18n'
import { primeVueLocales } from '@/plugins/primevue-locales'

const uiStore    = useUiStore()
const toast      = useToast()
const { locale } = useI18n()
const primevue   = usePrimeVue()

// ── T5.1: Apply PrimeVue locale for the given vue-i18n locale ────────────
function applyPrimeVueLocale(l: string): void {
  const pv = primeVueLocales[l as Locale]
  if (pv) Object.assign(primevue.config.locale ?? {}, pv)
}

// ── Sprint 2: load namespace JSON messages for the initial locale ─────────
onMounted(async () => {
  await loadLocaleMessages(locale.value as Locale)
  document.documentElement.setAttribute('lang', locale.value)
  applyPrimeVueLocale(locale.value)
})

// Reload messages and sync PrimeVue locale when the user switches language
watch(locale, async (newLocale) => {
  await loadLocaleMessages(newLocale as Locale)
  applyPrimeVueLocale(newLocale)
})

// ── Bridge uiStore.showToast() → PrimeVue Toast service ──────────────────
watch(
  () => uiStore.toastMessages.length,
  () => {
    const msg = uiStore.toastMessages[uiStore.toastMessages.length - 1]
    if (msg) toast.add({ severity: msg.severity as any, summary: msg.summary, detail: msg.detail, life: msg.life })
  },
)
</script>

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { addDays, toISOMonday } from '@/utils/dateUtils'

export const useStoreContext = defineStore('storeContext', () => {
  const storeId   = ref<string>('')
  const weekStart = ref<string>(toISOMonday(new Date())) // ISO Monday

  const weekEnd = computed(() => addDays(weekStart.value, 6))

  function setStore(id: string)    { storeId.value = id }
  function setWeek(monday: string) { weekStart.value = monday }
  function nextWeek()              { weekStart.value = addDays(weekStart.value, 7) }
  function prevWeek()              { weekStart.value = addDays(weekStart.value, -7) }

  return { storeId, weekStart, weekEnd, setStore, setWeek, nextWeek, prevWeek }
})

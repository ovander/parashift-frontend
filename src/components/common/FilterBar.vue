<template>
  <!--
    FilterBar — a responsive filter container.

    On mobile (< md): filters stack vertically, full width.
    On tablet+ (md+): filters lay out horizontally, each taking its natural width.
    Optionally collapsible on mobile via the `collapsible` prop.

    Usage:
      <FilterBar v-model:open="filtersOpen" :collapsible="isMobile">
        <Select ... />
        <DatePicker ... />
        <Button label="Clear" ... />
      </FilterBar>
  -->
  <div class="space-y-2">
    <!-- Toggle button — visible only when collapsible -->
    <div v-if="collapsible" class="flex items-center justify-between">
      <slot name="title">
        <span class="text-sm font-medium text-gray-600">Filters</span>
      </slot>
      <Button
        :icon="open ? 'pi pi-chevron-up' : 'pi pi-filter'"
        :label="open ? 'Hide filters' : 'Filters'"
        text
        size="small"
        @click="toggleOpen"
      />
    </div>

    <!-- Filter items container -->
    <Transition name="filter-expand">
      <div
        v-show="!collapsible || open"
        class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

const props = defineProps<{
  /** Whether the filter bar can be collapsed (default: false). */
  collapsible?: boolean
  /** v-model:open — controls collapsed/expanded state when collapsible=true. */
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

function toggleOpen() {
  emit('update:open', !props.open)
}
</script>

<style scoped>
.filter-expand-enter-active,
.filter-expand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.filter-expand-enter-from,
.filter-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

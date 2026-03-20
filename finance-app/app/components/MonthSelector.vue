<script setup lang="ts">
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const label = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const yearSuffix = year !== now.getFullYear() ? ` ${year}` : ''
  return MONTHS[month - 1] + yearSuffix
})
</script>

<template>
  <div class="flex items-center justify-center gap-4 py-2">
    <UButton
      v-if="store.hasPrev"
      color="neutral"
      variant="ghost"
      size="sm"
      icon="heroicons-solid:chevron-left"
      :loading="store.loading"
      class="drop-shadow"
      @click="store.prevMonth()"
    />
    <div v-else class="w-8" />
    <span class="text-md font-semibold w-36 text-center drop-shadow">{{ label }}</span>
    <UButton
      v-if="store.hasNext"
      color="neutral"
      variant="ghost"
      size="sm"
      icon="heroicons-solid:chevron-right"
      :loading="store.loading"
      class="drop-shadow"
      @click="store.nextMonth()"
    />
    <div v-else class="w-8" />
  </div>
</template>

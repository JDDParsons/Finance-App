<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()
const incomeRows = computed(() => store.income)

// Tapping a card expands it in place so its fields can be edited. One card at a time.
const expandedId = ref<string | null>(null)

function setExpanded(id: string, open: boolean) {
  if (open) expandedId.value = id
  else if (expandedId.value === id) expandedId.value = null
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <!-- Income calendar -->
    <CashflowIncomeCalendar />

    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="incomeRows.length === 0" class="text-center text-gray-400 py-16">
      No income records yet. Tap <strong>+</strong> to add one.
    </div>

    <div v-else class="flex flex-col gap-3">
      <div v-for="row in incomeRows" :key="row.id">
        <IncomeCard
          :income-id="row.id"
          :expanded="expandedId === row.id"
          @update:expanded="setExpanded(row.id, $event)"
        />
        <p v-if="row.pending_sync || row.sync_error" class="mt-1 text-right text-xs" :class="row.sync_error ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'">
          {{ row.sync_error || 'Waiting to sync' }}
        </p>
      </div>
    </div>
  </div>

</template>

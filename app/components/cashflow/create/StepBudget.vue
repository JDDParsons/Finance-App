<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

const emit = defineEmits<{
  select: [selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }]
}>()
</script>

<template>
  <div class="absolute inset-0 flex flex-col">
    <div class="shrink-0 px-4 pt-4 pb-0">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Add a transaction</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a budget to add an expense to it</p>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <BudgetsChooseBudget :budgets="store.budgets" @select="emit('select', $event)" />
    </div>
  </div>
</template>

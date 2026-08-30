<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useTransactionViewStore } from '~/stores/transactionView'

const store = useFinanceStore()
const transactionView = useTransactionViewStore()
const transactionType = computed({
  get: () => transactionView.selectedType,
  set: type => transactionView.selectType(type),
})
const visibleBudgets = computed(() => transactionType.value === 'income' ? store.incomeBudgets : store.budgets)

const emit = defineEmits<{
  select: [selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }]
}>()
</script>

<template>
  <div class="absolute inset-0 flex flex-col">
    <div class="shrink-0 px-4 pt-4 pb-0">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Add a transaction</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a transaction type and budget</p>
      <div class="mt-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <UButton :variant="transactionType === 'expense' ? 'solid' : 'ghost'" block @click="transactionType = 'expense'">Expense</UButton>
        <UButton :variant="transactionType === 'income' ? 'solid' : 'ghost'" block @click="transactionType = 'income'">Income</UButton>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <BudgetsChooseBudget :budgets="visibleBudgets" :type="transactionType" @select="emit('select', $event)" />
    </div>
  </div>
</template>

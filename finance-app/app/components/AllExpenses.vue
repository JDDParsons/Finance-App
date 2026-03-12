<script setup lang="ts">
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()

const budgetMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.name]))
)

const expenses = computed(() => store.budgetHits)

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this expense?')) return
  try {
    await store.removeExpense(id)
  } catch (err: any) {
    alert(err?.message || 'Failed to delete expense')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="expenses.length === 0" class="text-center text-gray-400 py-16">
      No expenses recorded for this month. Tap <strong>+</strong> to add one.
    </div>

    <div v-else class="flex flex-col gap-3">
      <SevenDayExpenses :expenses="expenses" />
      <ExpenseCard
        v-for="hit in expenses"
        :key="hit.id"
        :id="hit.id"
        :amount="hit.amount"
        :date="hit.date"
        :note="hit.note"
        :budget-name="budgetMap.get(hit.budget_id)"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

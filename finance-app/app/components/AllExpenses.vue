<script setup lang="ts">
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()

const budgetMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.name]))
)

const expenses = computed(() => store.budgetHits)

const selectedExpense = ref<any>(null)
const isEditingExpense = ref(false)

function handleEdit(id: string) {
  selectedExpense.value = expenses.value.find((h: any) => h.id === id) ?? null
  if (selectedExpense.value) isEditingExpense.value = true
}

function handleEditClose() {
  isEditingExpense.value = false
  selectedExpense.value = null
}

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
        @edit="handleEdit"
      />
    </div>
  </div>

  <UModal v-if="selectedExpense" v-model:open="isEditingExpense" @update:open="(val) => { if (!val) handleEditClose() }">
    <template #content>
      <UCard>
        <template #header>
          <h2 class="text-2xl font-bold">Edit Expense</h2>
        </template>
        <ExpenseEdit
          :expense-id="selectedExpense.id"
          :expense-amount="selectedExpense.amount"
          :expense-date="selectedExpense.date"
          :expense-note="selectedExpense.note"
          :expense-budget-id="selectedExpense.budget_id"
          @update="handleEditClose"
          @cancel="handleEditClose"
          @delete="handleEditClose"
        />
        <template #footer>
          <UButton color="neutral" variant="ghost" @click="handleEditClose" class="mr-2 mt-1">
            Close
          </UButton>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

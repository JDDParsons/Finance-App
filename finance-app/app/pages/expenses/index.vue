<script setup lang="ts">
import { ref, computed } from 'vue'
import { getBudgetHits, getBudgets } from '../../composables/supabase'

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1
const monthLabel = today.toLocaleString('en-US', { month: 'long', year: 'numeric' })

const isCreateExpenseModalOpen = ref(false)

const { data: rawExpenses, refresh: refreshExpenses } = await useAsyncData('all-budget-hits', () => getBudgetHits())
const { data: allBudgets } = await useAsyncData('all-budgets-expenses-page', () => getBudgets())

const budgetMap = computed(() =>
  new Map<string, string>((allBudgets.value || []).map((b: any) => [b.id, b.name]))
)

const expenses = computed(() =>
  (rawExpenses.value || []).filter((hit: any) => {
    if (!hit.date) return false
    const d = new Date(hit.date)
    return d.getUTCFullYear() === currentYear && (d.getUTCMonth() + 1) === currentMonth
  })
)

const total = computed(() =>
  expenses.value.reduce((sum: number, hit: any) => sum + (Number(hit.amount) || 0), 0)
)

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

async function handleExpenseCreated() {
  await refreshExpenses()
  isCreateExpenseModalOpen.value = false
}

async function handleDeleteHit(id: string) {
  if (!confirm('Are you sure you want to delete this expense?')) return
  try {
    await deleteBudgetHit(id)
    await refreshExpenses() // Refresh the list after deletion
  } catch (err: any) {
    alert(err?.message || 'Failed to delete expense')
    console.error('Error deleting expense:', err)
  }
} 
</script>

<template>
<UHeader title="Finance App">
  <template #right>
    <UColorModeSwitch />
    <UButton class="ml-2" color="neutral" variant="ghost" size="sm" @click="signOut()">Sign out</UButton>
  </template>
</UHeader>
  <div class="pl-4 pr-4 pt-2 max-w-xl mx-auto">
    <div class="flex mb-4">
      <div class="flex flex-col">
        <h1 class="text-3xl font-bold">{{ monthLabel }} Expenses</h1>
        <div class="flex">
        <UButton color="info" variant="solid" size="sm" class="mt-2 w-28" @click="isCreateExpenseModalOpen = true">
          <UIcon name="subway:add-1" class="size-3" />
          Add Expense
        </UButton>
        </div>
        <UBadge color="secondary" variant="subtle" size="lg" class="mt-3">Total: {{ formatCurrency(total) }}</UBadge>
      </div>
    </div>

    <div v-if="expenses.length === 0" class="text-center py-12">
      <p class="text-gray-400">No expenses recorded for this month.</p>
    </div>

    <div v-else class="space-y-3 pb-15">
      <UCard v-for="hit in expenses" :key="hit.id">
        <div class="flex items-center gap-4">
          <p class="text-sm font-semibold">{{ formatDate(hit.date) }}</p>
          <p class="text-sm font-bold text-info">{{ formatCurrency(hit.amount) }}</p>
          <UBadge v-if="budgetMap.get(hit.budget_id)" color="primary" variant="subtle" class="ml-auto">{{ budgetMap.get(hit.budget_id) }}</UBadge>
          <UBadge v-else color="warning" variant="subtle" class="ml-auto">No budget</UBadge>
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            class=""
            @click="() => handleDeleteHit(hit.id)"
          >
            <UIcon name="heroicons-solid:x" color="error" class="size-3" />
          </UButton>
        </div>
        <p v-if="hit.note" class="text-sm mt-1 text-gray-400">{{ hit.note }}</p>
      </UCard>
    </div>
  </div>

  <UModal v-model:open="isCreateExpenseModalOpen">
    <template #content>
      <BudgetExpenseCreate
        :budgets="allBudgets ?? []"
        @update="handleExpenseCreated"
        @cancel="isCreateExpenseModalOpen = false"
      />
    </template>
  </UModal>
</template>
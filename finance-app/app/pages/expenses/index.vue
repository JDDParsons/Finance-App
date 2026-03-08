<script setup lang="ts">
import { ref, computed } from 'vue'
import { getBudgetHits, getBudgets, deleteBudgetHit, createBudgetHit, signOut } from '../../composables/supabase'

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1
const monthLabel = today.toLocaleString('en-US', { month: 'long', year: 'numeric' })

const isSlideoverOpen = ref(false)
const expenseAmount = ref('')
const expenseDate = ref(new Date().toLocaleDateString('en-CA'))
const expenseNote = ref('')
const selectedBudgetId = ref('')
const noBudget = ref(false)
const createLoading = ref(false)

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

function validateExpenseForm() {
  if (!expenseDate.value) {
    alert('Please select a date')
    return false
  }
  if (!expenseAmount.value) {
    alert('Please enter an amount')
    return false
  }
  if (!noBudget.value && !selectedBudgetId.value) {
    alert('Please select a budget')
    return false
  }
  return true
}

async function handleCreateExpense() {
  if (validateExpenseForm()) {
    try {
      createLoading.value = true
      const budgetIdToSubmit = noBudget.value ? null : selectedBudgetId.value
      await createBudgetHit(budgetIdToSubmit, expenseDate.value, expenseAmount.value, expenseNote.value)
      expenseAmount.value = ''
      expenseDate.value = new Date().toLocaleDateString('en-CA')
      expenseNote.value = ''
      selectedBudgetId.value = ''
      noBudget.value = false
      isSlideoverOpen.value = false
      await refreshExpenses()
    } catch (error: any) {
      alert('Error creating expense: ' + (error?.message || 'Unknown error'))
    } finally {
      createLoading.value = false
    }
  }
}

function closeSlideover() {
  isSlideoverOpen.value = false
  expenseAmount.value = ''
  expenseDate.value = new Date().toLocaleDateString('en-CA')
  expenseNote.value = ''
  selectedBudgetId.value = ''
  noBudget.value = false
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
  <div class="pl-2 pr-2 max-w-xl mx-auto">
    <div class="flex items-center justify-center pt-2 mb-2">
        <h2 class="text-3xl font-bold">Monthly Expenses</h2>
        <UButton 
            color="secondary" 
            variant="ghost" 
            size="sm" 
            class="ml-2"
            @click="isSlideoverOpen = true"
        >
            <UIcon name="fa-solid:plus-circle" class="size-8" />
        </UButton>
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

  <USlideover 
    v-model:open="isSlideoverOpen"
    class="w-full sm:max-w-md"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <div class="flex-1 p-6 overflow-y-auto">
          <h3 class="text-2xl font-bold mb-6">Add an expense</h3>
          
          <div class="space-y-6">
            <UFormField label="Amount" required>
              <UInput
                v-model="expenseAmount"
                placeholder="0.00"
                type="number"
                step="0.01"
                size="xl"
              />
            </UFormField>

            <UFormField label="Date" required>
              <UInput
                v-model="expenseDate"
                type="date"
                size="xl"
              />
            </UFormField>

            <UFormField label="Note">
              <UInput
                v-model="expenseNote"
                placeholder="Leave a note..."
                type="text"
                size="xl"
              />
            </UFormField>

            <UFormField label="Budget" :required="!noBudget">
              <USelect
                v-model="selectedBudgetId"
                :items="(allBudgets ?? []).map((b: any) => ({ label: b.name, value: b.id }))"
                placeholder="Select a budget..."
                size="xl"
                :disabled="noBudget"
              />
            </UFormField>

            <UCheckbox v-model="noBudget" label="No budget" />
          </div>
        </div>
        
        <div class="p-6 border-t">
          <div class="flex gap-3">
            <UButton
              color="secondary"
              @click="handleCreateExpense"
              class="flex-1"
              size="lg"
              :loading="createLoading"
              :disabled="createLoading"
            >
              Add this expense
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="closeSlideover"
              class="flex-1"
              size="lg"
              :disabled="createLoading"
            >
              Close
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
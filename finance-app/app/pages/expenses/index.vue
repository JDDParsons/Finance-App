<script setup lang="ts">
import { getBudgetHits } from '../../composables/supabase'

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1

const allExpenses = await getBudgetHits()

const expenses = allExpenses.filter((hit: any) => {
  if (!hit.date) return false
  const d = new Date(hit.date)
  return d.getUTCFullYear() === currentYear && (d.getUTCMonth() + 1) === currentMonth
})

const monthLabel = today.toLocaleString('en-US', { month: 'long', year: 'numeric' })

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const total = expenses.reduce((sum: number, hit: any) => sum + (Number(hit.amount) || 0), 0)
</script>

<template>

<UHeader title="Finance App">
<template #right>
    <UColorModeSwitch />
    <UButton class="ml-2" color="neutral" variant="ghost" size="sm" @click="signOut()">Sign out</UButton>
</template>
</UHeader>
  <div class="p-4 max-w-xl mx-auto">
    <div class="flex flex-col mb-4">
      <h1 class="text-3xl font-bold mb-2">{{ monthLabel }} Expenses</h1>
      <div class="flex items-center gap-2">
        <span class="text-md font-semibold text-gray-400">Total...</span>
        <span class="text-md font-semibold text-primary">{{ formatCurrency(total) }}</span>
      </div>
    </div>

    <div v-if="expenses.length === 0" class="text-center py-12">
      <p class="text-gray-400">No expenses recorded for this month.</p>
    </div>

    <div v-else class="space-y-3 pb-15">
      <UCard v-for="hit in expenses" :key="hit.id">
        <div class="flex items-center gap-4">
          <p class="text-sm font-semibold">{{ formatDate(hit.date) }}</p>
          <p class="text-sm font-bold text-primary">{{ formatCurrency(hit.amount) }}</p>
          <p v-if="hit.note" class="text-sm text-gray-400">{{ hit.note }}</p>
        </div>
      </UCard>
    </div>
  </div>

</template>
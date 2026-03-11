<script setup lang="ts">
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()

const budgetMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.name]))
)

// store.budgetHits already contains only the selected month's data
const expenses = computed(() => store.budgetHits)

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this expense?')) return
  try {
    await store.removeExpense(id)
  } catch (err: any) {
    alert(err?.message || 'Failed to delete expense')
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
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
      <UCard v-for="hit in expenses" :key="hit.id">
        <div class="flex items-center gap-4">
          <p class="text-sm font-semibold">{{ formatDate(hit.date) }}</p>
          <p class="text-sm font-bold text-info">{{ formatCurrency(hit.amount) }}</p>
          <UBadge v-if="budgetMap.get(hit.budget_id)" color="primary" variant="subtle" class="ml-auto">
            {{ budgetMap.get(hit.budget_id) }}
          </UBadge>
          <UBadge v-else color="warning" variant="subtle" class="ml-auto">No budget</UBadge>
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            @click="handleDelete(hit.id)"
          >
            <UIcon name="heroicons-solid:x" class="size-3" />
          </UButton>
        </div>
        <p v-if="hit.note" class="text-sm mt-1 text-gray-400">{{ hit.note }}</p>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getBudgetHits, getBudgets, deleteBudgetHit } from '../composables/supabase'

const rawExpenses = ref<any[]>([])
const allBudgets = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1

onMounted(async () => {
  await refresh()
})

async function refresh() {
  try {
    loading.value = true
    error.value = null
    const [hits, budgets] = await Promise.all([getBudgetHits(), getBudgets()])
    rawExpenses.value = hits
    allBudgets.value = budgets
  } catch (err: any) {
    error.value = err?.message || 'Failed to load expenses'
  } finally {
    loading.value = false
  }
}

const budgetMap = computed(() =>
  new Map<string, string>(allBudgets.value.map((b: any) => [b.id, b.name]))
)

const expenses = computed(() =>
  rawExpenses.value.filter((hit: any) => {
    if (!hit.date) return false
    const d = new Date(hit.date)
    return d.getUTCFullYear() === currentYear && (d.getUTCMonth() + 1) === currentMonth
  })
)

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this expense?')) return
  try {
    await deleteBudgetHit(id)
    rawExpenses.value = rawExpenses.value.filter((h: any) => h.id !== id)
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

defineExpose({ refresh })
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="error" color="error" :description="error" />

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

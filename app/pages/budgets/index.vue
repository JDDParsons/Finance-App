<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

useHead({ title: 'Budgets | R&J Finance' })

const store = useFinanceStore()
const router = useRouter()
const loading = computed(() => store.loading)
const error = computed(() => store.error)

const displayBudgets = computed(() =>
  [...store.budgets].sort((a: any, b: any) => (b.currentPeriod?.amount || 0) - (a.currentPeriod?.amount || 0))
)
</script>

<template>
  <div class="min-h-screen">
    <AppHeader title="Budgets" />

    <UContainer class="max-w-none">
      <div class="mt-4 mb-2">
        <BudgetsAllocationGaugeBar />
      </div>

      <UAlert v-if="error" class="mb-4" title="Error" :description="error" color="error" variant="soft" />

      <div v-if="loading" class="py-12 text-center">
        <p class="text-gray-400">Loading budgets...</p>
      </div>

      <div v-else class="grid grid-cols-3 gap-3 pb-24 sm:grid-cols-3 lg:grid-cols-4 lg:pb-6">
        <BudgetsBudgetCard
          v-for="budget in displayBudgets"
          :key="budget.id"
          :budget="budget"
          @select="router.push(`/budgets/${budget.id}`)"
        />
        <BudgetsAddBudgetCard @select="router.push('/budgets/create')" />
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Budget Summary | R&J Finance' })

const store = useFinanceStore()

onMounted(() => { store.ensureLoaded() })
</script>

<template>
  <UContainer>
    <MonthSelector />

    <!-- Header with back button -->
    <div class="relative flex items-center justify-center pt-2 mb-4">
      <UButton
        icon="heroicons-solid:arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        class="absolute left-0"
        to="/budgets"
      />
      <h2 class="text-3xl font-bold">Budget Summary</h2>
    </div>

    <div class="pb-24 space-y-4">
      <BudgetsUncategorizedAlert />
      <BudgetsAllocationPieChart />
      <BudgetsSummary />
    </div>
  </UContainer>
</template>

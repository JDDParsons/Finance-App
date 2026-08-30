<script setup lang="ts">
useHead({ title: 'Cash Flow | Budgify' })

const activeTab = ref<'expenses' | 'income'>('expenses')
</script>

<template>
  <div>
    <AppHeader title="Cashflow" />

    <UContainer class="max-w-none">
    <!-- Mobile/tablet: segmented transaction view -->
    <div class="pb-24 lg:pb-6 lg:hidden">
      <div class="mt-4 mb-2">
        <div class="mb-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <UButton :variant="activeTab === 'expenses' ? 'solid' : 'ghost'" block @click="activeTab = 'expenses'">Expenses</UButton>
          <UButton :variant="activeTab === 'income' ? 'solid' : 'ghost'" block @click="activeTab = 'income'">Income</UButton>
        </div>
      </div>

      <CashflowAllExpenses v-if="activeTab === 'expenses'" />
      <CashflowAllIncome v-else />
    </div>

    <!-- Desktop: combined table -->
    <div class="hidden lg:block pb-6">
      <CashflowTransactionsTable />
    </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Cash Flow | Budgify' })

// Tab state — 'income' | 'expenses'
const activeTab = ref('expenses')
</script>

<template>
  <div>
    <AppHeader title="Cashflow" />

    <!-- Mobile/tablet: tabs -->
    <div class="px-4 pb-24 lg:pb-6 lg:hidden">
      <UTabs
        v-model="activeTab"
        color="primary"
        :items="[
          { label: 'Expenses', slot: 'expenses', icon: 'heroicons-solid:arrow-trending-down', value: 'expenses' },
          { label: 'Income', slot: 'income', icon: 'heroicons-solid:arrow-trending-up', value: 'income' }
        ]"
      >
        <template #income>
          <CashflowAllIncome />
        </template>
        <template #expenses>
          <CashflowAllExpenses />
        </template>
      </UTabs>
    </div>

    <!-- Desktop: combined table -->
    <div class="hidden lg:block px-4 pb-6">
      <CashflowTransactionsTable />
    </div>
  </div>
</template>

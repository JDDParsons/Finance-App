<script setup lang="ts">
import { useTransactionViewStore } from '~/stores/transactionView'

useHead({ title: 'Cash Flow | Budgify' })

const transactionView = useTransactionViewStore()
</script>

<template>
  <div>
    <AppHeader title="Cashflow" />

    <UContainer class="max-w-none">
    <!-- Mobile/tablet: segmented transaction view -->
    <div class="pb-24 lg:pb-6 lg:hidden">
      <div class="mt-4 mb-2">
        <div class="mb-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <UButton :variant="transactionView.selectedType === 'expense' ? 'solid' : 'ghost'" block @click="transactionView.selectType('expense')">Expenses</UButton>
          <UButton :variant="transactionView.selectedType === 'income' ? 'solid' : 'ghost'" block @click="transactionView.selectType('income')">Income</UButton>
        </div>
      </div>

      <CashflowAllExpenses v-if="transactionView.selectedType === 'expense'" />
      <CashflowAllIncome v-else />
    </div>

    <!-- Desktop: combined table -->
    <div class="hidden lg:block pb-6">
      <CashflowTransactionsTable />
    </div>
    </UContainer>
  </div>
</template>

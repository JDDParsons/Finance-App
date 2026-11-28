<script setup lang="ts">
import { useTransactionViewStore } from '~/stores/transactionView'

useHead({ title: 'Cash Flow | Budgify' })

const transactionView = useTransactionViewStore()
</script>

<template>
  <div>
    <AppHeader title="Cashflow" />
    <OtherMonthBanner />

    <UContainer class="max-w-none lg:px-0">
      <div class="flex justify-center pt-3 lg:pb-3">
        <MonthSelector />
      </div>

    <!-- Mobile/tablet: segmented transaction view -->
    <div class="pb-28 lg:pb-6 lg:hidden">
      <div class="mt-4 mb-2">
        <div class="mb-4 grid grid-cols-3 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <UButton :variant="transactionView.selectedType === 'expense' ? 'solid' : 'ghost'" block @click="transactionView.selectType('expense')">Expenses</UButton>
          <UButton :variant="transactionView.selectedType === 'income' ? 'solid' : 'ghost'" block @click="transactionView.selectType('income')">Income</UButton>
          <UButton :variant="transactionView.selectedType === 'transfer' ? 'solid' : 'ghost'" block @click="transactionView.selectType('transfer')">Transfers</UButton>
        </div>
      </div>

      <CashflowAllExpenses v-if="transactionView.selectedType === 'expense'" />
      <CashflowAllIncome v-else-if="transactionView.selectedType === 'income'" />
      <CashflowAllTransfers v-else />
    </div>

    <!-- Desktop: combined table -->
    <div class="hidden lg:block pb-6">
      <CashflowTransactionsTable />
    </div>
    </UContainer>
  </div>
</template>

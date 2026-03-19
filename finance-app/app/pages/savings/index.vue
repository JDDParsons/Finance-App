<script setup lang="ts">
import { useFinanceStore } from '../../stores/finance'
import { useSavingsStore } from '../../stores/savings'

const financeStore = useFinanceStore()
const savingsStore = useSavingsStore()

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const now = new Date()

const currentMonthLabel = computed(() => {
  const { year, month } = financeStore.selectedMonth
  const yearSuffix = year !== now.getFullYear() ? ` ${year}` : ''
  return MONTHS[month - 1] + yearSuffix
})

const previousMonthLabel = computed(() => {
  const { year, month } = savingsStore.previousMonth
  const yearSuffix = year !== now.getFullYear() ? ` ${year}` : ''
  return MONTHS[month - 1] + yearSuffix
})

function formatCurrency(value: number) {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
  return value < 0 ? `-${formatted}` : formatted
}

const savingsFormatted = computed(() => formatCurrency(savingsStore.savings))
const currentSavingsFormatted = computed(() => formatCurrency(savingsStore.currentSavings))
const grandTotalFormatted = computed(() => formatCurrency(savingsStore.grandTotal))

onMounted(async () => {
  await financeStore.fetchAll()
  await savingsStore.fetchPrevMonthData()
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 pb-24">
    <MonthSelector />

    <!-- Header -->
    <div class="relative flex items-center justify-center pt-2 mb-2">
        <h2 class="text-3xl font-bold">Savings</h2>
    </div>

    <div class="px-4 pt-4 flex flex-col gap-4">

      <!-- Current month -->
      <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2">
        <p class="text-lg text-gray-500 dark:text-gray-400 font-bold">{{ currentMonthLabel }}</p>

        <div v-if="financeStore.loading" class="flex justify-center py-4">
          <UIcon name="heroicons-solid:arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
        </div>

        <template v-else>
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Income</span>
            <span>{{ formatCurrency(savingsStore.currentIncome) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Expenses</span>
            <span>{{ formatCurrency(savingsStore.currentExpenses) }}</span>
          </div>
          <div class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
            <span class="font-semibold text-gray-800 dark:text-gray-100">Remaining in {{ currentMonthLabel }}:</span>
            <span
              class="text-xl font-bold"
              :class="savingsStore.currentSavings >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ currentSavingsFormatted }}
            </span>
          </div>
        </template>
      </div>

      <!-- Previous month -->
      <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2">
        <p class="text-lg text-gray-500 dark:text-gray-400 font-bold">{{ previousMonthLabel }}</p>

        <div v-if="savingsStore.loading" class="flex justify-center py-4">
          <UIcon name="heroicons-solid:arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
        </div>

        <template v-else>
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Income</span>
            <span>{{ formatCurrency(savingsStore.income) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Expenses</span>
            <span>{{ formatCurrency(savingsStore.expenses) }}</span>
          </div>
          <div class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
            <span class="font-semibold text-gray-800 dark:text-gray-100">Saved in {{ previousMonthLabel }}:</span>
            <span
              class="text-xl font-bold"
              :class="savingsStore.savings >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ savingsFormatted }}
            </span>
          </div>
        </template>
      </div>

      <!-- Grand total -->
      <div class="rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
        <span class="font-bold text-gray-800 dark:text-gray-100">Total savings to date:</span>
        <span
          class="text-2xl font-bold"
          :class="savingsStore.grandTotal >= 0 ? 'text-green-500' : 'text-red-500'"
        >
          {{ grandTotalFormatted }}
        </span>
      </div>

    </div>
  </div>
</template>

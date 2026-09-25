<script setup lang="ts">
import { buildDailySpendingCells, dailySpendingColors } from '../../../utils/dailySpending'

const props = defineProps<{
  year: number
  month: number
  hits: Array<{
    id?: string | null
    date?: string | null
    amount?: number | string | null
    budget_id?: string | null
    entity?: string | null
  }>
  budgets: Array<{ id: string, name?: string | null, color?: string | null }>
  dailyBudgetedIncome: number
}>()

const cells = computed(() => buildDailySpendingCells(
  props.year,
  props.month,
  props.hits,
  props.dailyBudgetedIncome,
))

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function cellLabel(dateKey: string, amount: number, budgetRatio: number) {
  return `${formatDate(dateKey)}: ${currency.format(amount)} spent, ${Math.round(budgetRatio * 100)}% of projected daily income`
}

function cellStyle(amount: number) {
  const { backgroundColor, borderColor } = dailySpendingColors(amount, props.dailyBudgetedIncome)
  return { backgroundColor, borderColor }
}

function transactionBudget(budgetId: string | null) {
  return props.budgets.find(budget => budget.id === budgetId)
}

function transactionLabel(transaction: { amount: number, budgetId: string | null, entity: string | null }) {
  const budget = transactionBudget(transaction.budgetId)
  const details = [budget?.name ?? 'Uncategorized', transaction.entity].filter(Boolean).join(' · ')
  return `${currency.format(transaction.amount)} · ${details}`
}
</script>

<template>
  <UCard class="hidden shadow lg:col-span-3 lg:block" :ui="{ body: 'p-3 sm:p-4' }">
    <figure>
      <figcaption class="text-center">
        <h3 class="font-semibold">Daily spending</h3>
        <p class="text-sm text-muted">
          Last 31 days compared with {{ currency.format(dailyBudgetedIncome) }} projected daily income
        </p>
      </figcaption>

      <div class="mt-4 grid grid-cols-[repeat(31,minmax(0,1fr))] gap-2" aria-label="Daily spending for the last 31 days">
        <div
          v-for="cell in cells"
          :key="cell.dateKey"
          class="group relative flex flex-col transition-transform hover:-translate-y-0.5"
        >
          <div
            v-if="cell.startsNewMonth"
            class="pointer-events-none absolute -left-1 inset-y-0 border-l border-dashed border-gray-300 dark:border-gray-600"
            aria-hidden="true"
          />
          <div class="mb-1 flex flex-1 flex-col justify-end gap-1">
            <div
              v-for="transaction in cell.transactions"
              :key="transaction.id"
              class="h-1.5 w-full rounded-sm"
              :style="{ backgroundColor: transactionBudget(transaction.budgetId)?.color ?? '#9CA3AF' }"
              role="img"
              :aria-label="transactionLabel(transaction)"
              :title="transactionLabel(transaction)"
            />
          </div>
          <div
            class="flex h-14 items-center justify-center rounded-md border px-1"
            :style="cellStyle(cell.amount)"
            role="img"
            :aria-label="cellLabel(cell.dateKey, cell.amount, cell.budgetRatio)"
            :title="cellLabel(cell.dateKey, cell.amount, cell.budgetRatio)"
          >
            <span class="truncate text-sm font-semibold text-gray-950">
              {{ currency.format(cell.amount) }}
            </span>
          </div>
          <p class="mt-1 text-center text-xs text-muted">{{ formatDate(cell.dateKey) }}</p>
        </div>
      </div>

      <div class="mx-auto mt-3 max-w-xl text-xs text-muted" aria-hidden="true">
        <div
          class="h-2 rounded-full"
          style="background: linear-gradient(to right, hsl(120 75% 78%), hsl(50 75% 78%), hsl(28 75% 78%), hsl(0 75% 78%));"
        />
        <div class="mt-1 flex justify-between">
          <span>$0</span>
          <span>100%</span>
          <span>200%</span>
          <span>300%+</span>
        </div>
      </div>
    </figure>
  </UCard>
</template>

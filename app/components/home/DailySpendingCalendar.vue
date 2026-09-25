<script setup lang="ts">
import {
  buildDailySpendingCalendarCells,
  buildDailySpendingCells,
  dailySpendingColors,
} from '../../../utils/dailySpending'

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
  budgets: Array<{ id: string, color?: string | null }>
  dailyBudgetedIncome: number
}>()

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const spendingCells = computed(() => buildDailySpendingCells(
  props.year,
  props.month,
  props.hits,
  props.dailyBudgetedIncome,
))

const calendarCells = computed(() => buildDailySpendingCalendarCells(spendingCells.value))

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDay(dateKey: string) {
  return Number(dateKey.slice(-2))
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateFromKey(dateKey))
}

const dateRangeLabel = computed(() => {
  const first = spendingCells.value[0]
  const last = spendingCells.value.at(-1)
  if (!first || !last) return ''

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${formatter.format(dateFromKey(first.dateKey))} – ${formatter.format(dateFromKey(last.dateKey))}`
})

function dayStyle(amount: number) {
  return dailySpendingColors(amount, props.dailyBudgetedIncome)
}

function dayLabel(dateKey: string, amount: number, transactionCount: number) {
  const transactionLabel = transactionCount === 1 ? 'transaction' : 'transactions'
  return `${formatDate(dateKey)}: ${currency.format(amount)} spent across ${transactionCount} ${transactionLabel}`
}

function transactionColor(budgetId: string | null) {
  return props.budgets.find(budget => budget.id === budgetId)?.color ?? '#6B7280'
}
</script>

<template>
  <UCard class="col-span-2 shadow lg:hidden" :ui="{ body: 'p-3 sm:p-4' }">
    <figure>
      <figcaption class="text-center">
        <h3 class="font-semibold">Daily spending</h3>
        <p class="text-sm text-muted">{{ dateRangeLabel }}</p>
      </figcaption>

      <div class="mt-3 grid grid-cols-7" aria-hidden="true">
        <span
          v-for="weekday in weekdays"
          :key="weekday"
          class="pb-1 text-center text-[10px] font-medium text-muted sm:text-xs"
        >
          {{ weekday }}
        </span>
      </div>

      <div class="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Daily spending calendar for the last 31 days">
        <div
          v-for="(cell, index) in calendarCells"
          :key="cell?.dateKey ?? `empty-${index}`"
          class="aspect-square min-w-0"
        >
          <div
            v-if="cell"
            class="relative flex size-full flex-col rounded-md border p-1"
            :style="{
              backgroundColor: dayStyle(cell.amount).backgroundColor,
              borderColor: dayStyle(cell.amount).borderColor,
            }"
            role="img"
            :aria-label="dayLabel(cell.dateKey, cell.amount, cell.transactions.length)"
            :title="dayLabel(cell.dateKey, cell.amount, cell.transactions.length)"
          >
            <span class="text-xs font-semibold text-gray-950 sm:text-sm">{{ formatDay(cell.dateKey) }}</span>
            <span class="mt-auto flex flex-wrap items-end gap-0.5" aria-hidden="true">
              <span
                v-for="transaction in cell.transactions"
                :key="transaction.id"
                class="size-1.5 rounded-full ring-1 ring-white/70 sm:size-2"
                :style="{ backgroundColor: transactionColor(transaction.budgetId) }"
              />
            </span>
          </div>
        </div>
      </div>

      <div class="mx-auto mt-3 max-w-sm text-xs text-muted" aria-hidden="true">
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

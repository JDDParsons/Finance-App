<script setup lang="ts">
import { buildMonthCalendarCells, type MonthCalendarCell, type MonthCalendarIncome } from '../../../utils/monthCalendar'
import type { DailySpendingHit } from '../../../utils/dailySpending'

const props = defineProps<{
  year: number
  month: number
  hits: DailySpendingHit[]
  income: MonthCalendarIncome[]
  budgets: Array<{ id: string, color?: string | null }>
}>()

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// The app can stay open past midnight, so "today" is read again on return.
const now = ref(new Date())
const refresh = () => { now.value = new Date() }
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(refresh, 60_000)
  document.addEventListener('visibilitychange', refresh)
})

onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', refresh)
})

const cells = computed(() => buildMonthCalendarCells(
  props.year,
  props.month,
  props.hits,
  props.income,
  now.value,
))

const monthDate = computed(() => new Date(props.year, props.month - 1, 1))
const monthName = computed(() => monthDate.value.toLocaleDateString('en-US', { month: 'long' }))
const monthLabel = computed(() => monthDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function dayLabel(cell: MonthCalendarCell) {
  const count = cell.transactions.length
  const parts = [
    `${monthName.value} ${cell.day}${cell.isToday ? ', today' : ''}: ${currency.format(cell.spent)} spent across ${count} ${count === 1 ? 'transaction' : 'transactions'}`,
  ]
  if (cell.income) {
    parts.push(`${currency.format(cell.income.amount)} ${cell.income.isPlanned ? 'planned income' : 'income'}`)
  }
  return parts.join(', ')
}

function transactionColor(budgetId: string | null) {
  return props.budgets.find(budget => budget.id === budgetId)?.color ?? '#6B7280'
}
</script>

<template>
  <!-- Shaped and lit like the remaining card above, on a plain background -->
  <figure class="relative isolate col-span-2 overflow-hidden rounded-2xl bg-default p-4 shadow-lg shadow-emerald-600/15 ring-1 ring-green-500/20 lg:hidden">
    <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgb(92_204_133/0.16),transparent_50%)]" />

    <figcaption>
      <h3 class="text-2xl font-extrabold tracking-tight">Daily activity</h3>
      <p class="text-sm font-semibold text-muted">{{ monthLabel }}</p>
    </figcaption>

    <div class="mt-3 grid grid-cols-7" aria-hidden="true">
      <span
        v-for="weekday in weekdays"
        :key="weekday"
        class="pb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-green-600 sm:text-xs dark:text-green-400"
      >
        {{ weekday }}
      </span>
    </div>

    <div class="grid grid-cols-7 gap-1 sm:gap-2" :aria-label="`Daily activity calendar for ${monthLabel}`">
      <div
        v-for="(cell, index) in cells"
        :key="cell?.dateKey ?? `empty-${index}`"
        class="aspect-square min-w-0"
      >
        <div
          v-if="cell"
          class="relative flex size-full flex-col rounded-xl border-2 p-1"
          :class="cell.isToday
            ? 'border-green-500 bg-green-500/10'
            : 'border-transparent bg-gray-500/5 dark:bg-white/5'"
          role="img"
          :aria-current="cell.isToday ? 'date' : undefined"
          :aria-label="dayLabel(cell)"
          :title="dayLabel(cell)"
        >
          <span class="text-xs font-bold leading-none sm:text-sm">{{ cell.day }}</span>
          <!-- The logo's coin: filled once the day arrives, an outline while planned -->
          <span
            v-if="cell.income"
            class="absolute right-px top-0.5 flex size-3.5 items-center max-[359px]:right-0 max-[359px]:top-auto max-[359px]:bottom-0 max-[359px]:size-3 justify-center rounded-full border-[1.5px] border-green-500 text-[9px] font-extrabold leading-none sm:size-5 sm:text-xs"
            :class="cell.income.isPlanned ? 'text-green-600 dark:text-green-400' : 'bg-green-500 text-white'"
            aria-hidden="true"
          >$</span>
          <span
            class="mt-auto flex flex-wrap items-end gap-0.5"
            :class="{ 'max-[359px]:pr-3': cell.income }"
            aria-hidden="true"
          >
            <span
              v-for="transaction in cell.transactions"
              :key="transaction.id"
              class="size-1.5 rounded-full sm:size-2"
              :style="{ backgroundColor: transactionColor(transaction.budgetId) }"
            />
          </span>
        </div>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-center gap-4 text-xs text-muted" aria-hidden="true">
      <span class="flex items-center gap-1.5">
        <span class="flex size-3.5 items-center justify-center rounded-full border-[1.5px] border-green-500 bg-green-500 text-[9px] font-extrabold leading-none text-white">$</span>
        Income
      </span>
      <span class="flex items-center gap-1.5">
        <span class="flex size-3.5 items-center justify-center rounded-full border-[1.5px] border-green-500 text-[9px] font-extrabold leading-none text-green-600 dark:text-green-400">$</span>
        Planned income
      </span>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

function fmt(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const isCurrentMonth = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  return year === now.getFullYear() && month === (now.getMonth() + 1)
})

const todayStr = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

const daysInMonth = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month, 0).getDate()
})

const daysElapsed = computed(() => {
  if (isCurrentMonth.value) return new Date().getDate()
  return daysInMonth.value
})

const totalIncome = computed(() =>
  store.income.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0)
)

const totalExpenses = computed(() =>
  store.budgetHits.reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0)
)

const avgDailyIncome = computed(() =>
  daysInMonth.value > 0 ? totalIncome.value / daysInMonth.value : 0
)

const avgDailySpending = computed(() =>
  daysElapsed.value > 0 ? totalExpenses.value / daysElapsed.value : 0
)

const incomeToday = computed(() => {
  if (!isCurrentMonth.value) return null
  return store.income
    .filter((i: any) => (i.date ?? '').slice(0, 10) === todayStr.value)
    .reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0)
})

const spendingToday = computed(() => {
  if (!isCurrentMonth.value) return null
  return store.budgetHits
    .filter((h: any) => (h.date ?? '').slice(0, 10) === todayStr.value)
    .reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0)
})

const cells = computed(() => [
  {
    label: 'Avg Daily Income',
    value: fmt(avgDailyIncome.value),
    color: 'text-primary',
  },
  {
    label: "Today's Income",
    value: incomeToday.value !== null ? fmt(incomeToday.value) : '—',
    color: 'text-primary',
  },
  {
    label: 'Avg Daily Spending',
    value: fmt(avgDailySpending.value),
    color: 'text-warning',
  },
  {
    label: "Today's Spending",
    value: spendingToday.value !== null ? fmt(spendingToday.value) : '—',
    color: 'text-warning',
  },
])
</script>

<template>
  <div class="grid grid-cols-2 gap-3 h-full">
    <USkeleton v-if="store.loading" v-for="n in 4" :key="n" class="rounded-lg opacity-40 h-16" />
    <template v-else>
      <div
        v-for="cell in cells"
        :key="cell.label"
        class="flex flex-col items-center justify-center rounded-lg bg-elevated/50 border border-default/40 px-3 py-3 text-center gap-1"
      >
        <p class="text-xs text-muted leading-tight">{{ cell.label }}</p>
        <p class="text-base font-semibold" :class="cell.color">{{ cell.value }}</p>
      </div>
    </template>
  </div>
</template>

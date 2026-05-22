<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js'
import { useFinanceStore } from '~/stores/finance'

ChartJS.register(ArcElement, Tooltip)

const store = useFinanceStore()

function fmt(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const daysInMonth = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month, 0).getDate()
})

const totalIncome = computed(() =>
  store.income.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0)
)

const avgDailyIncome = computed(() =>
  daysInMonth.value > 0 ? totalIncome.value / daysInMonth.value : 0
)

// Reference "today": actual today for current month, last day of month otherwise
const refDate = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
  return isCurrentMonth ? now : new Date(year, month, 0)
})

function getSpendingForWindow(n: number): number {
  const ref = refDate.value
  const refStr = toDateStr(ref)

  const start = new Date(ref)
  start.setDate(ref.getDate() - (n - 1))
  const startStr = toDateStr(start)

  return store.budgetHits.reduce((sum: number, h: any) => {
    const d = (h.date ?? '').slice(0, 10)
    if (d >= startStr && d <= refStr) return sum + (Number(h.amount) || 0)
    return sum
  }, 0)
}

const windows = [
  { n: 1, label: 'Today' },
  { n: 3, label: '3 Days' },
  { n: 7, label: '7 Days' },
]

const donuts = computed(() =>
  windows.map(({ n, label }) => {
    const budget = avgDailyIncome.value * n
    const spending = getSpendingForWindow(n)
    const remaining = Math.max(0, budget - spending)
    const isOverBudget = budget > 0 && spending > budget
    const pct = budget > 0 ? Math.min(Math.round((spending / budget) * 100), 100) : 0

    const chartData = budget === 0
      ? {
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(75,85,99,0.25)'],
            borderWidth: 0,
          }],
        }
      : {
          datasets: [{
            data: [spending || 0, remaining],
            backgroundColor: [
              isOverBudget ? 'rgba(239,68,68,0.85)' : 'rgba(245,158,11,0.85)',
              'rgba(34,197,94,0.2)',
            ],
            borderColor: [
              isOverBudget ? '#EF4444' : '#F59E0B',
              '#22c55e',
            ],
            borderWidth: 1,
            hoverBorderWidth: 1,
          }],
        }

    return { label, n, spending, budget, remaining, isOverBudget, pct, chartData }
  })
)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          if (ctx.chart.data.datasets[0].data.length === 1) return ' No income set'
          const labels = ['Spending', 'Remaining']
          return ` ${labels[ctx.dataIndex] ?? ''}: ${fmt(ctx.parsed)}`
        },
      },
    },
  },
}
</script>

<template>
  <div class="grid grid-cols-3 gap-3">
    <template v-if="store.loading">
      <USkeleton v-for="n in 3" :key="n" class="rounded-lg opacity-40" style="height: 120px;" />
    </template>

    <template v-else>
      <div
        v-for="donut in donuts"
        :key="donut.label"
        class="flex flex-col items-center gap-2 rounded-lg bg-elevated/50 border border-default/40 p-3"
      >
        <!-- Chart + center label overlay -->
        <div class="relative w-full" style="height: 84px;">
          <Doughnut :data="donut.chartData" :options="chartOptions" />
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              class="text-xs font-semibold leading-tight tabular-nums"
              :class="donut.isOverBudget ? 'text-red-400' : 'text-highlighted'"
            >
              {{ fmt(donut.spending) }}
            </span>
          </div>
        </div>

        <p class="text-xs text-muted leading-tight">{{ donut.label }}</p>
      </div>
    </template>
  </div>
</template>

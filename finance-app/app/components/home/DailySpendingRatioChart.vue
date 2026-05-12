<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { useFinanceStore } from '~/stores/finance'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

const store = useFinanceStore()

const monthLabel = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month, 0).getDate()
})

const totalIncome = computed(() =>
  store.income.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0)
)

// Average income per day across the full month
const avgDailyIncome = computed(() =>
  daysInMonth.value > 0 ? totalIncome.value / daysInMonth.value : 0
)

// Number of days to display: up to today for current month, full month otherwise
const displayedDays = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
  return isCurrentMonth ? now.getDate() : daysInMonth.value
})

// Per-day spending totals (non-cumulative)
const dailySpending = computed(() => {
  const cutoffDay = displayedDays.value
  const totals = Array(cutoffDay).fill(0)
  for (const hit of store.budgetHits) {
    const amount = Number(hit.amount) || 0
    const day = Number(String(hit.date ?? '').slice(8, 10))
    if (!day || day > cutoffDay) continue
    totals[day - 1] += amount
  }
  return totals
})

// Percentage of average daily income spent each day
const ratioData = computed(() =>
  dailySpending.value.map(spent =>
    avgDailyIncome.value > 0 ? (spent / avgDailyIncome.value) * 100 : 0
  )
)

// Bar colour: green when ≤ 100 %, amber when > 100 %
const barColors = computed(() =>
  ratioData.value.map(pct => pct <= 100 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(245, 158, 11, 0.8)')
)

const borderColors = computed(() =>
  ratioData.value.map(pct => pct <= 100 ? '#22c55e' : '#F59E0B')
)

const chartData = computed(() => ({
  labels: Array.from({ length: displayedDays.value }, (_, i) => `${i + 1}`),
  datasets: [
    {
      label: 'Spending %',
      data: ratioData.value,
      backgroundColor: barColors.value,
      borderColor: borderColors.value,
      borderWidth: 1,
      borderRadius: 2,
    },
  ],
}))

const barChart = ref()

watch(chartData, (newData) => {
  const chart = barChart.value?.chart
  if (!chart) return
  chart.data.labels = newData.labels
  chart.data.datasets.forEach((dataset: any, i: number) => {
    Object.assign(dataset, newData.datasets[i] ?? {})
  })
  chart.update('none')
}, { deep: true })

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: { label: string }[]) => {
          const day = items[0]?.label
          return day ? `${monthLabel.value} — Day ${day}` : monthLabel.value
        },
        label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
          ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`,
      },
    },
    annotation: undefined,
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: '#9CA3AF',
        maxTicksLimit: 10,
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(156,163,175,0.15)' },
      border: { display: false },
      ticks: {
        color: '#9CA3AF',
        callback: (value: string | number) => `${value}%`,
      },
    },
  },
}))
</script>

<template>
  <div>
    <h2 class="text-sm text-center pb-2">Daily Spending vs. Avg Income</h2>

    <USkeleton v-if="store.loading" class="w-full rounded-lg opacity-40" style="height: 205px;" />

    <template v-else>
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-4 text-xs text-muted">
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 rounded-sm bg-green-500 opacity-70"></span>
            ≤ 100% of daily avg
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 rounded-sm bg-amber-400 opacity-80"></span>
            &gt; 100% of daily avg
          </span>
        </div>
      </div>

      <div class="h-44">
        <Bar ref="barChart" :data="chartData" :options="chartOptions" />
      </div>
    </template>
  </div>
</template>

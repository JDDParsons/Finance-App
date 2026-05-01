<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { useFinanceStore } from '~/stores/finance'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const store = useFinanceStore()

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

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

// Daily budget = income spread evenly over the month
const dailyBudget = computed(() =>
  daysInMonth.value > 0 ? totalIncome.value / daysInMonth.value : 0
)

// Number of days to display: up to today for the current month, full month otherwise
const displayedDays = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
  return isCurrentMonth ? now.getDate() : daysInMonth.value
})

// Baseline spans only up to displayedDays
const baselineData = computed(() =>
  Array.from({ length: displayedDays.value }, (_, i) => dailyBudget.value * (i + 1))
)

// Spending is cumulative up to today (no nulls — chart is trimmed to today)
const cumulativeSpending = computed(() => {
  const cutoffDay = displayedDays.value

  const dailyTotals = Array(cutoffDay).fill(0)
  for (const hit of store.budgetHits) {
    const amount = Number(hit.amount) || 0
    const day = Number(String(hit.date ?? '').slice(8, 10))
    if (!day || day > cutoffDay) continue
    dailyTotals[day - 1] += amount
  }

  const cumulative: number[] = []
  let running = 0
  for (let i = 0; i < cutoffDay; i++) {
    running += dailyTotals[i]
    cumulative.push(running)
  }
  return cumulative
})

// Show a dot only at the last (today's) point on the spending line
const spendingPointRadii = computed(() => {
  const len = cumulativeSpending.value.length
  return [0, ...Array.from({ length: len }, (_, i) => i === len - 1 ? 4 : 0)]
})

const chartData = computed(() => ({
  labels: ['0', ...Array.from({ length: displayedDays.value }, (_, i) => `${i + 1}`)],
  datasets: [
    {
      label: 'Baseline',
      data: [0, ...baselineData.value],
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      order: 2,
    },
    {
      label: 'Spending',
      data: [0, ...cumulativeSpending.value],
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: spendingPointRadii.value,
      pointHoverRadius: 5,
    },
  ],
}))

const lineChart = ref()

watch(chartData, (newData) => {
  const chart = lineChart.value?.chart
  if (!chart) return
  chart.data.labels = newData.labels
  chart.data.datasets.forEach((dataset: any, i: number) => {
    dataset.data = newData.datasets[i]?.data ?? []
    if (newData.datasets[i]?.pointRadius !== undefined) {
      dataset.pointRadius = newData.datasets[i].pointRadius
    }
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
          ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
      },
    },
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
        callback: (value: string | number) => formatCurrency(Number(value)),
      },
    },
  },
}))
</script>

<template>
  <div>
    <h2 class="text-sm text-center pb-2">Cumulative Daily Spending</h2>

    <USkeleton v-if="store.loading" class="w-full rounded-lg opacity-40" style="height: 205px;" />

    <template v-else>
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-4 text-xs text-muted">
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-4 h-0.5 bg-green-500 rounded-full"></span>
            Maximum daily budget
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-4 h-0.5 bg-amber-400 rounded-full"></span>
            Actual amount spent
          </span>
        </div>
      </div>

      <div class="h-44">
        <Line ref="lineChart" :data="chartData" :options="chartOptions" />
      </div>
    </template>
  </div>
</template>

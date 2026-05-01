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

// Baseline always spans the full month
const baselineData = computed(() =>
  Array.from({ length: daysInMonth.value }, (_, i) => dailyBudget.value * (i + 1))
)

// Spending is cumulative up to today; null beyond that so the line stops
const cumulativeSpending = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
  const cutoffDay = isCurrentMonth ? now.getDate() : daysInMonth.value

  const dailyTotals = Array(daysInMonth.value).fill(0)
  for (const hit of store.budgetHits) {
    const amount = Number(hit.amount) || 0
    const day = Number(String(hit.date ?? '').slice(8, 10))
    if (!day || day > cutoffDay) continue
    dailyTotals[day - 1] += amount
  }

  const cumulative: (number | null)[] = []
  let running = 0
  for (let i = 0; i < daysInMonth.value; i++) {
    if (i < cutoffDay) {
      running += dailyTotals[i]
      cumulative.push(running)
    } else {
      cumulative.push(null)
    }
  }
  return cumulative
})

const chartData = computed(() => ({
  labels: Array.from({ length: daysInMonth.value }, (_, i) => `${i + 1}`),
  datasets: [
    {
      label: 'Baseline',
      data: baselineData.value,
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
      data: cumulativeSpending.value,
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      order: 1,
    },
  ],
}))

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
    <h2 class="text-sm text-center pb-2">Cumulative Spending</h2>

    <USkeleton v-if="store.loading" class="w-full rounded-lg opacity-40" style="height: 205px;" />


      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-4 text-xs text-muted">
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-4 h-0.5 bg-green-500 rounded-full"></span>
            Baseline
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-4 h-0.5 bg-amber-400 rounded-full"></span>
            Spending
          </span>
        </div>
      </div>

      <div class="h-42">
        <Line :data="chartData" :options="chartOptions" />
      </div>
  </div>
</template>

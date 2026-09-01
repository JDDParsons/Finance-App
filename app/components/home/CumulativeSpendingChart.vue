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
import { useHitsApi } from '~/composables/api/useHitsApi'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const store = useFinanceStore()
const { getDailySpendingAverage } = useHitsApi()
const spendingAverage = ref<{ dailyAverages: number[]; months: number } | null>(null)
let averageRequest = 0

watch(
  () => [store.selectedMonth.year, store.selectedMonth.month] as const,
  async ([year, month]) => {
    const request = ++averageRequest
    try {
      const result = await getDailySpendingAverage(year, month)
      if (request === averageRequest) spendingAverage.value = result
    } catch {
      if (request === averageRequest) spendingAverage.value = null
    }
  },
  { immediate: true }
)

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

// Always show the selected month in full. Budget and average reference lines
// continue through month-end, while current spending stops at today.
const displayedDays = computed(() => daysInMonth.value)

const isChartLocked = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  return isCurrentMonth && now.getDate() < 3
})

// Spread the month's budgeted income evenly across its calendar days, then
// accumulate it so the line remains comparable with cumulative spending.
const cumulativeDailyBudgetedIncome = computed(() => {
  const budgetedIncome = store.incomeBudgets.reduce(
    (sum, budget) => sum + (Number(budget.currentPeriod?.amount) || 0),
    0
  )
  const dailyBudgetedIncome = budgetedIncome / daysInMonth.value
  return Array.from(
    { length: displayedDays.value },
    (_, day) => dailyBudgetedIncome * (day + 1)
  )
})

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

// Highlight today for the current month, or the final day for past months.
const spendingPointRadii = computed(() => {
  const len = cumulativeSpending.value.length
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const highlightedIndex = isCurrentMonth ? now.getDate() - 1 : len - 1
  return Array.from({ length: len }, (_, index) => index === highlightedIndex ? 6 : 0)
})

const cumulativeAverageSpending = computed(() => {
  if (!spendingAverage.value) return null
  const cumulative: number[] = []
  let running = 0
  for (let day = 0; day < displayedDays.value; day++) {
    running += spendingAverage.value.dailyAverages[day] ?? 0
    cumulative.push(running)
  }
  return cumulative
})

const spendingChartData = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  if (!isCurrentMonth) return cumulativeSpending.value

  return cumulativeSpending.value.map((value, index) =>
    index < now.getDate() ? value : null
  )
})

const chartData = computed(() => ({
  labels: Array.from({ length: displayedDays.value }, (_, i) => `${i + 1}`),
  datasets: [
    {
      label: 'Daily budgeted income',
      data: cumulativeDailyBudgetedIncome.value,
      borderColor: 'rgba(34, 197, 94, 0.55)',
      borderDash: [6, 5],
      backgroundColor: 'transparent',
      fill: {
        target: 1,
        above: 'rgba(34, 197, 94, 0.15)',
        below: 'transparent',
      },
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 1.5,
      order: 2,
    },
    {
      label: 'Spending',
      data: spendingChartData.value,
      borderColor: '#F59E0B',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: spendingPointRadii.value,
      pointHoverRadius: 7,
      pointBackgroundColor: '#F59E0B',
      pointBorderColor: '#F59E0B',
      pointBorderWidth: 2,
    },
    ...(cumulativeAverageSpending.value ? [{
      label: 'Average spending',
      data: cumulativeAverageSpending.value,
      borderColor: '#9CA3AF',
      backgroundColor: 'transparent',
      borderDash: [6, 5],
      borderWidth: 2,
      fill: false,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      order: 1,
    }] : []),
  ],
}))

const lineChart = ref()

watch(chartData, (newData) => {
  const chart = lineChart.value?.chart
  if (!chart) return
  chart.data.labels = newData.labels
  // Replace the collection because the optional average dataset arrives asynchronously.
  chart.data.datasets = newData.datasets as any
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
    <h2 class="text-sm font-semibold text-center pb-2">This month versus previous months</h2>

    <USkeleton v-if="store.loading" class="w-full rounded-lg opacity-40" style="height: 205px;" />

    <template v-else>
      <div v-if="isChartLocked" class="flex h-52 flex-col items-center justify-center text-gray-400 dark:text-gray-500 lg:h-[296px]">
        <UIcon name="heroicons:lock-closed" class="h-10 w-10" />
        <p class="mt-3 text-sm">Unlocked on the 3rd day</p>
      </div>

      <template v-else>
        <div class="h-44 lg:h-[264px]">
          <Line ref="lineChart" :data="chartData" :options="chartOptions" />
        </div>
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-4 h-0.5 bg-amber-400 rounded-full"></span>
              This month's spending
            </span>
            <span v-if="spendingAverage" class="flex items-center gap-1.5">
              <span class="inline-block w-4 border-t-2 border-dashed border-gray-400"></span>
              Average spending
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-4 border-t-2 border-dashed border-green-500 opacity-60"></span>
              Projected daily budgeted income
            </span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

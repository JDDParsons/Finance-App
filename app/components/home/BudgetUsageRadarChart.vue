<script setup lang="ts">
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import { useFinanceStore } from '~/stores/finance'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const FALLBACK_COLORS = ['#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6']

const isChartLocked = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  return isCurrentMonth && now.getDate() < 7
})

const topBudgets = computed(() =>
  [...store.budgets]
    .filter(budget => (Number(budget.currentPeriod?.amount) || 0) > 0)
    .sort((a, b) =>
      (Number(b.currentPeriod?.amount) || 0) - (Number(a.currentPeriod?.amount) || 0)
    )
    .slice(0, 5)
    .map((budget, index) => {
      const allocation = Number(budget.currentPeriod?.amount) || 0
      const spent = Number(budget.totalHitAmount) || 0
      return {
        id: budget.id,
        name: budget.name,
        icon: budget.icon ?? budgetIcon(budget.name),
        color: budget.color ?? FALLBACK_COLORS[index],
        allocation,
        spent,
        percentage: allocation > 0 ? (spent / allocation) * 100 : 0,
      }
    })
)

const radialMaximum = computed(() => {
  const largest = Math.max(100, ...topBudgets.value.map(budget => budget.percentage))
  return Math.ceil(largest / 25) * 25
})

const chartData = computed(() => ({
  labels: topBudgets.value.map(budget => budget.name),
  datasets: [{
    label: 'Budget used',
    data: topBudgets.value.map(budget => budget.percentage),
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    pointBackgroundColor: topBudgets.value.map(budget => budget.color),
    pointBorderColor: topBudgets.value.map(budget => budget.color),
    pointHoverBackgroundColor: topBudgets.value.map(budget => budget.color),
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: 50 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: { dataIndex: number; parsed: { r: number } }) => {
          const budget = topBudgets.value[context.dataIndex]
          if (!budget) return ''
          return ` ${context.parsed.r.toFixed(0)}% used ($${budget.spent.toLocaleString()} of $${budget.allocation.toLocaleString()})`
        },
      },
    },
  },
  scales: {
    r: {
      beginAtZero: true,
      max: radialMaximum.value,
      ticks: {
        stepSize: 25,
        color: '#9CA3AF',
        backdropColor: 'transparent',
        callback: (value: string | number) => `${value}%`,
      },
      angleLines: { color: 'rgba(156, 163, 175, 0.2)' },
      grid: { color: 'rgba(156, 163, 175, 0.2)' },
      pointLabels: { display: false },
    },
  },
}))

function labelPosition(index: number, count: number) {
  const angle = (Math.PI * 2 * index) / count
  return {
    left: `${50 + Math.sin(angle) * 39}%`,
    top: `${50 - Math.cos(angle) * 38}%`,
  }
}
</script>

<template>
  <div>
    <h2 class="pb-2 text-center text-sm font-semibold">Your biggest budgets this month</h2>

    <USkeleton v-if="store.loading" class="h-[360px] w-full rounded-lg opacity-40" />

    <div v-else-if="isChartLocked" class="flex h-[360px] flex-col items-center justify-center text-gray-400 dark:text-gray-500 lg:h-[300px]">
      <UIcon name="heroicons:lock-closed" class="h-10 w-10" />
      <p class="mt-3 text-sm">Unlocked on the 7th day</p>
    </div>

    <div v-else-if="topBudgets.length >= 3" class="relative mx-auto h-[360px] w-full max-w-2xl sm:h-[440px] lg:h-[300px]">
      <Radar :data="chartData" :options="chartOptions" />

      <div
        v-for="(budget, index) in topBudgets"
        :key="budget.id"
        class="pointer-events-none absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
        :style="labelPosition(index, topBudgets.length)"
      >
        <span
          class="flex h-7 w-7 items-center justify-center rounded-full"
          :style="{ color: budget.color, backgroundColor: `${budget.color}20` }"
        >
          <UIcon :name="budget.icon" class="h-4 w-4" />
        </span>
        <span class="mt-0.5 text-[11px] font-small leading-tight text-highlighted">{{ budget.name }}</span>
      </div>
    </div>

    <UCard v-else class="shadow">
      <p class="py-4 text-center text-sm text-muted">
        Add allocations to at least three expense budgets to see budget usage.
      </p>
    </UCard>
  </div>
</template>

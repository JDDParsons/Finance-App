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
import type { Chart, Plugin } from 'chart.js'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import { useFinanceStore } from '~/stores/finance'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()
const pointPositions = ref<{ x: number; y: number }[]>([])
const budgetCount = ref(5)
let positionUpdateFrame: number | undefined

const budgetPointPositionPlugin: Plugin<'radar'> = {
  id: 'budgetPointPositions',
  afterRender(chart: Chart<'radar'>) {
    const positions = chart.getDatasetMeta(0).data.map(point => ({ x: point.x, y: point.y }))

    window.cancelAnimationFrame(positionUpdateFrame ?? 0)
    positionUpdateFrame = window.requestAnimationFrame(() => {
      const positionsChanged = positions.length !== pointPositions.value.length
        || positions.some((position, index) => {
          const current = pointPositions.value[index]
          return !current || current.x !== position.x || current.y !== position.y
        })

      if (positionsChanged) pointPositions.value = positions
    })
  },
}

onBeforeUnmount(() => window.cancelAnimationFrame(positionUpdateFrame ?? 0))

const FALLBACK_COLORS = ['#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6']
const MAX_CHART_BUDGETS = 10

const isChartLocked = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  return isCurrentMonth && now.getDate() < 7
})

const fundedBudgets = computed(() =>
  [...store.budgets]
    .filter(budget => (Number(budget.currentPeriod?.amount) || 0) > 0)
    .sort((a, b) =>
      (Number(b.currentPeriod?.amount) || 0) - (Number(a.currentPeriod?.amount) || 0)
    )
    .map((budget, index) => {
      const allocation = Number(budget.currentPeriod?.amount) || 0
      const spent = Number(budget.totalHitAmount) || 0
      return {
        id: budget.id,
        name: budget.name,
        icon: budget.icon ?? budgetIcon(budget.name),
        color: budget.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        allocation,
        spent,
        percentage: allocation > 0 ? (spent / allocation) * 100 : 0,
      }
    })
)

const maximumBudgetCount = computed(() => Math.min(MAX_CHART_BUDGETS, fundedBudgets.value.length))
const topBudgets = computed(() => fundedBudgets.value.slice(0, budgetCount.value))

watch(maximumBudgetCount, (maximum) => {
  if (maximum >= 3 && budgetCount.value > maximum) budgetCount.value = maximum
})

const radialMaximum = computed(() => {
  const largest = Math.max(100, ...topBudgets.value.map(budget => budget.percentage))
  return Math.ceil(largest / 25) * 25
})

const chartData = computed(() => ({
  labels: topBudgets.value.map(budget => budget.name),
  datasets: [{
    label: 'Budget used',
    data: topBudgets.value.map(budget => budget.percentage),
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    pointBackgroundColor: topBudgets.value.map(budget => `${budget.color}99`),
    pointBorderColor: topBudgets.value.map(budget => `${budget.color}99`),
    pointHoverBackgroundColor: topBudgets.value.map(budget => budget.color),
    pointRadius: 12,
    pointHoverRadius: 14,
    borderWidth: 1,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: 20 },
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
</script>

<template>
  <div>
    <USkeleton v-if="store.loading" class="h-[220px] w-full rounded-lg opacity-40" />

    <div v-else-if="isChartLocked" class="flex h-[220px] flex-col items-center justify-center text-gray-400 dark:text-gray-500 lg:h-[300px]">
      <UIcon name="heroicons:lock-closed" class="h-10 w-10" />
      <p class="mt-3 text-sm">Unlocked on the 7th day</p>
    </div>

    <div v-else-if="fundedBudgets.length >= 3" class="mx-auto flex h-[300px] w-full max-w-2xl sm:h-[300px] lg:h-[300px]">
      <div
        v-if="maximumBudgetCount > 3"
        class="flex w-10 shrink-0 flex-col items-center justify-center gap-1 py-8"
      >
        <span class="text-xs font-semibold tabular-nums text-highlighted">{{ budgetCount }}</span>
        <UIcon name="lucide:plus" class="size-3.5 text-muted" aria-hidden="true" />
        <input
          v-model.number="budgetCount"
          type="range"
          :min="3"
          :max="maximumBudgetCount"
          step="1"
          orient="vertical"
          aria-label="Number of budgets shown"
          class="h-36 w-2 cursor-pointer accent-amber-500 [direction:rtl] [writing-mode:vertical-lr] sm:h-44 lg:h-36"
        >
        <UIcon name="lucide:minus" class="size-3.5 text-muted" aria-hidden="true" />
      </div>

      <div class="relative min-w-0 flex-1">
        <Radar :data="chartData" :options="chartOptions" :plugins="[budgetPointPositionPlugin]" />

        <span
          v-for="(budget, index) in topBudgets"
          :key="budget.id"
          class="pointer-events-none absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-white"
          :style="pointPositions[index] ? { left: `${pointPositions[index].x}px`, top: `${pointPositions[index].y}px` } : { display: 'none' }"
        >
          <UIcon :name="budget.icon" class="h-4 w-4" />
        </span>
      </div>
    </div>

    <UCard v-else class="shadow">
      <p class="py-4 text-center text-sm text-muted">
        Add allocations to at least three expense budgets to see budget usage.
      </p>
    </UCard>
  </div>
</template>

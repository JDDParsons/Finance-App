<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

interface BudgetHistoryPoint {
  month: string
  spent: number
  budgeted: number
}

const props = defineProps<{
  history: BudgetHistoryPoint[]
  color?: string | null
}>()

const spentColor = computed(() => props.color || '#22c55e')

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(month: string, includeYear = false) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

const chartData = computed(() => ({
  labels: props.history.map(point => formatMonth(point.month)),
  datasets: [
    {
      label: 'Spent',
      data: props.history.map(point => point.spent),
      borderColor: spentColor.value,
      backgroundColor: spentColor.value,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.3,
    },
    {
      label: 'Budgeted',
      data: props.history.map(point => point.budgeted),
      borderColor: '#94a3b8',
      backgroundColor: '#94a3b8',
      borderDash: [5, 4],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
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
      titleFont: { size: 12, weight: '600' as const },
      bodyFont: { size: 12, weight: 'normal' as const },
      callbacks: {
        title: (items: { dataIndex: number }[]) => {
          const point = props.history[items[0]?.dataIndex ?? -1]
          return point ? formatMonth(point.month, true) : ''
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
        autoSkip: false,
        font: { size: 12, weight: 'normal' as const },
        maxRotation: 45,
        minRotation: 0,
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(156,163,175,0.12)' },
      border: { display: false },
      ticks: {
        color: '#9CA3AF',
        maxTicksLimit: 4,
        font: { size: 12, weight: 'normal' as const },
        callback: (value: string | number) => formatCurrency(Number(value)),
      },
    },
  },
}))
</script>

<template>
  <div>
    <p class="mb-2 text-center text-xs text-gray-500">Monthly spending vs budget</p>
    <div class="h-52">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div class="mt-2 flex justify-center gap-4 text-xs text-muted">
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-0.5 w-4 rounded-full" :style="{ backgroundColor: spentColor }" />
        Spent
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-4 border-t-2 border-dashed border-slate-400" />
        Budgeted
      </span>
    </div>
  </div>
</template>

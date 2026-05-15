<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import { useFinanceStore } from '~/stores/finance'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const FALLBACK_PALETTE = [
  '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#10B981',
]

const UNCATEGORIZED_KEY = '__uncategorized__'
const UNCATEGORIZED_ICON = 'heroicons:question-mark-circle-solid'
const UNCATEGORIZED_COLOR = '#CBD5E1'
const hiddenBudgetKeys = ref<string[]>([])

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

const fullDayCount = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month, 0).getDate()
})

const displayedDayCount = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
  return isCurrentMonth ? now.getDate() : fullDayCount.value
})

const datasets = computed(() => {
  const totalsByBudget = new Map<string | null, number[]>()

  for (const hit of store.budgetHits) {
    const amount = Number(hit.amount) || 0
    const day = Number(String(hit.date ?? '').slice(8, 10))
    if (!day || day > displayedDayCount.value) continue

    const budgetId = hit.budget_id ?? null
    if (!totalsByBudget.has(budgetId)) {
      totalsByBudget.set(budgetId, Array(displayedDayCount.value).fill(0))
    }

    const dayTotals = totalsByBudget.get(budgetId)
    if (!dayTotals) continue
    dayTotals[day - 1] += amount
  }

  const datasetEntries = [...totalsByBudget.entries()].map(([budgetId, totals], index) => {
    const budget = budgetId ? store.budgets.find((item: any) => item.id === budgetId) : null
    const fallbackIndex = budgetId ? index : 0
    const key = budgetId ?? UNCATEGORIZED_KEY

    return {
      key,
      label: budget?.name ?? 'Uncategorized',
      data: totals,
      total: totals.reduce((sum, value) => sum + value, 0),
      backgroundColor: budget?.color ?? (budgetId ? FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length] : UNCATEGORIZED_COLOR),
      borderWidth: 0,
      borderRadius: 2,
      borderSkipped: false as const,
      stack: 'expenses',
    }
  })

  datasetEntries.sort((a, b) => b.total - a.total)

  return datasetEntries
})

const chartData = computed(() => {
  const labels = Array.from({ length: displayedDayCount.value }, (_, i) => `${i + 1}`)
  const visibleDatasets = datasets.value.filter(dataset => !hiddenBudgetKeys.value.includes(dataset.key))

  return {
    labels,
    datasets: visibleDatasets,
  }
})

const budgetFilters = computed(() =>
  datasets.value.map(dataset => ({
    key: dataset.key,
    label: dataset.label,
    color: dataset.backgroundColor,
    iconName: dataset.key === UNCATEGORIZED_KEY ? UNCATEGORIZED_ICON : budgetIcon(dataset.label),
    hidden: hiddenBudgetKeys.value.includes(dataset.key),
  }))
)

function toggleBudget(key: string) {
  if (hiddenBudgetKeys.value.includes(key)) {
    hiddenBudgetKeys.value = hiddenBudgetKeys.value.filter(item => item !== key)
    return
  }

  hiddenBudgetKeys.value = [...hiddenBudgetKeys.value, key]
}

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        title: (items: { label: string }[]) => {
          const day = items[0]?.label
          return day ? `${monthLabel.value} ${day}` : monthLabel.value
        },
        label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
          ` ${context.dataset.label ?? 'Uncategorized'}: ${formatCurrency(context.parsed.y)}`,
        footer: (items: { parsed: { y: number } }[]) => {
          const total = items.reduce((sum, item) => sum + item.parsed.y, 0)
          return items.length > 1 ? `Total: ${formatCurrency(total)}` : ''
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
      ticks: {
        display: false,
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: {
        color: 'rgba(156,163,175,0.15)',
      },
      border: {
        display: false,
      },
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
    <h2 class="text-2xl text-center font-bold pb-2">Daily Spending</h2>

    <USkeleton v-if="store.loading" class="w-full rounded-lg opacity-40" style="height: 220px;" />

    <UCard v-else-if="datasets.length" class="shadow">
      <div class="flex items-center justify-between gap-3 mb-3">
        <p class="text-sm font-semibold text-muted">{{ monthLabel }}</p>
        <p class="text-xs text-muted">Stacked by budget</p>
      </div>

      <div v-if="chartData.datasets.length" class="h-44">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="h-44 flex items-center justify-center text-sm text-muted text-center">
        All budgets are hidden. Tap a budget below to show it again.
      </div>

      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <p class="text-xs text-muted mb-2">Budgets</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="budget in budgetFilters"
            :key="budget.key"
            type="button"
            class="inline-flex items-center justify-center rounded-full border w-9 h-9 transition-opacity"
            :class="budget.hidden ? 'opacity-45 border-gray-200 dark:border-gray-700' : 'opacity-100 border-gray-300 dark:border-gray-600'"
            :title="budget.label"
            :aria-label="budget.label"
            :style="{ backgroundColor: `${budget.color}22`, color: budget.color }"
            @click="toggleBudget(budget.key)"
          >
            <UIcon :name="budget.iconName" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </UCard>

    <UCard v-else class="shadow">
      <p class="text-sm text-muted text-center py-4">No expenses this month.</p>
    </UCard>
  </div>
</template>

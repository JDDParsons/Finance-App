<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { useFinanceStore } from '~/stores/finance'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  expenses: { amount: number | null; date: string | null; budget_id?: string | null }[]
}>()

const store = useFinanceStore()

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Fallback palette for budgets without a custom colour
const FALLBACK_PALETTE = [
  '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#06B6D4',
]

const chartData = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })
  const dayStrs = days.map(d => d.toISOString().slice(0, 10))
  const labels = days.map(d => DAY_LABELS[d.getDay()])

  // Collect ordered unique budget IDs from the expenses (null = no budget)
  const seen = new Set<string | null>()
  const orderedBudgetIds: (string | null)[] = []
  for (const e of props.expenses) {
    const id = e.budget_id ?? null
    if (!seen.has(id)) { seen.add(id); orderedBudgetIds.push(id) }
  }

  // Build a dataset per budget
  let fallbackIdx = 0
  const datasets = orderedBudgetIds.map(budgetId => {
    const budget = budgetId ? store.budgets.find((b: any) => b.id === budgetId) : null
    const label = budget?.name ?? 'No budget'
    const raw = budget?.color ?? null
    const color = raw ?? FALLBACK_PALETTE[fallbackIdx++ % FALLBACK_PALETTE.length]

    const data = dayStrs.map(dayStr =>
      props.expenses
        .filter(e => (e.budget_id ?? null) === budgetId && e.date?.slice(0, 10) === dayStr)
        .reduce((sum, e) => sum + (e.amount ?? 0), 0)
    )

    return {
      label,
      data,
      total: data.reduce((s, v) => s + v, 0),
      backgroundColor: color + 'CC',
      hoverBackgroundColor: color,
      borderRadius: 0,
      borderSkipped: false,
    }
  })

  // Largest total at the bottom of the stack (first dataset), smallest on top
  datasets.sort((a, b) => b.total - a.total)

  return { labels, datasets }
})

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
      position: 'bottom' as const,
      labels: {
        color: '#9CA3AF',
        boxWidth: 10,
        boxHeight: 10,
        padding: 8,
        font: { size: 11 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        footer: (items: any[]) => {
          const total = items.reduce((s, i) => s + i.parsed.y, 0)
          return items.length > 1 ? `Total: ${formatCurrency(total)}` : ''
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: '#9CA3AF' },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: { color: 'rgba(156,163,175,0.15)' },
      ticks: {
        color: '#9CA3AF',
        callback: (v: string | number) => formatCurrency(typeof v === 'number' ? v : Number(v)),
      },
    },
  },
}))
</script>

<template>
  <UCard class="shadow">
    <p class="text-sm font-semibold text-gray-500 mb-3">Last 7 Days</p>
    <div class="h-40">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </UCard>
</template>

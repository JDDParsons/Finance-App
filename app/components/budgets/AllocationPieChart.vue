<script setup>
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Tooltip, Legend, ArcElement } from 'chart.js'
import { useAllocationHighlight } from '~/composables/useAllocationHighlight'
ChartJS.register(Tooltip, Legend, ArcElement)

const { highlightedIndex } = useAllocationHighlight()
const chartRef = ref(null)

const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

const store = useFinanceStore()

const totalAllocated = computed(() =>
  store.budgets.reduce((sum, b) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
)

const totalIncome = computed(() =>
  store.income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

const pctOfIncome = computed(() => {
  if (!totalIncome.value) return null
  return Math.round((totalAllocated.value / totalIncome.value) * 100)
})

function formatUSD(val) {
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const sortedBudgets = computed(() =>
  [...store.budgets]
    .filter(b => (Number(b.currentPeriod?.amount) || 0) > 0)
    .sort((a, b) => (Number(b.currentPeriod?.amount) || 0) - (Number(a.currentPeriod?.amount) || 0))
)

const chartData = computed(() => ({
  labels: sortedBudgets.value.map(b => b.name),
  datasets: [{
    data: sortedBudgets.value.map(b => Number(b.currentPeriod?.amount) || 0),
    backgroundColor: sortedBudgets.value.map((b, i) => b.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
    borderWidth: 2,
    borderColor: 'transparent',
    hoverOffset: 6,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${formatUSD(ctx.parsed)}`,
      },
    },
  },
}

watch(highlightedIndex, (idx) => {
  const chart = chartRef.value?.chart
  if (!chart) return
  if (idx === null) {
    chart.setActiveElements([])
    chart.tooltip.setActiveElements([])
  } else {
    chart.setActiveElements([{ datasetIndex: 0, index: idx }])
    chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: 0, y: 0 })
  }
  chart.update()
})
</script>

<template>
  <div class="w-full space-y-1">
    <USkeleton v-if="store.loading" class="w-full rounded opacity-40" style="height: 360px;" />
    <template v-else>
      <div style="height: 240px;">
        <Doughnut ref="chartRef" :data="chartData" :options="chartOptions" />
      </div>
    </template>
  </div>
</template>

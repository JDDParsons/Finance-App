<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Tooltip, BarElement, CategoryScale, LinearScale } from 'chart.js'
ChartJS.register(Tooltip, BarElement, CategoryScale, LinearScale)

const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

const store = useFinanceStore()

const totalAllocated = computed(() =>
  store.budgets.reduce((sum, b) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
)

const unbudgetedTotal = computed(() =>
  store.budgetHits.filter(h => !h.budget_id)
    .reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
)

const totalSpent = computed(() =>
  store.budgets.reduce((sum, b) => sum + (Number(b.totalHitAmount) || 0), 0) + unbudgetedTotal.value
)

const totalIncome = computed(() =>
  store.income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

const pctOfIncome = computed(() => {
  if (!totalIncome.value) return null
  return Math.round((totalAllocated.value / totalIncome.value) * 100)
})

const xMax = computed(() => Math.max(totalAllocated.value, totalSpent.value, 1))


// Sort by allocated amount descending so the largest budget is always on the left
const sortedBudgets = computed(() =>
  [...store.budgets].sort((a, b) =>
    (Number(b.currentPeriod?.amount) || 0) - (Number(a.currentPeriod?.amount) || 0)
  )
)

function formatUSD(val) {
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function makeChartData(key) {
  return {
    labels: [''],
    datasets: sortedBudgets.value.map((b, i) => ({
      label: b.name,
      data: [key === 'allocated'
        ? (Number(b.currentPeriod?.amount) || 0)
        : (Number(b.totalHitAmount) || 0)],
      backgroundColor: b.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      borderRadius: 3,
      barThickness: 22,
    })),
  }
}

const allocatedData = computed(() => makeChartData('allocated'))

const spentData = computed(() => {
  const base = makeChartData('spent')
  if (unbudgetedTotal.value > 0) {
    base.datasets.push({
      label: 'Unbudgeted',
      data: [unbudgetedTotal.value],
      backgroundColor: '#cbd5e1',
      borderRadius: 3,
      barThickness: 22,
    })
  }
  return base
})

function makeOptions() {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 0 },
    scales: {
      x: { stacked: true, display: false, max: xMax.value },
      y: { stacked: true, display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatUSD(ctx.parsed.x)}`,
        },
      },
    },
  }
}

const chartOptions = computed(() => makeOptions())
</script>

<template>
  <div class="w-full space-y-3">
    <USkeleton v-if="store.loading" class="w-full rounded" style="height: 72px;" />
    <template v-else>
      <div>
        <p class="text-xs text-muted text-center mb-1 font-bold">
          Allocated {{ formatUSD(totalAllocated) }}
          <span v-if="pctOfIncome !== null" :class="pctOfIncome > 100 ? 'text-error font-light' : ''">
            ({{ pctOfIncome }}% of income)
          </span>
        </p>
        <div style="height: 26px;">
          <Bar :data="allocatedData" :options="chartOptions" />
        </div>
      </div>
      <div>
        <p class="text-xs text-muted text-center mb-1 font-bold">
          Spent {{ formatUSD(totalSpent) }}
          <span v-if="unbudgetedTotal > 0" class="text-gray-400 font-light">(incl. {{ formatUSD(unbudgetedTotal) }} unbudgeted)</span>
        </p>
        <div style="height: 26px;">
          <Bar :data="spentData" :options="chartOptions" />
        </div>
      </div>
    </template>
  </div>
</template>

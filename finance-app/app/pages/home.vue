<script setup>
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import { useSelectedMonthTitle } from '~/composables/useSelectedMonthTitle'
// import MonthlyExpensesChart from '~/components/home/MonthlyExpensesChart.vue'
import CumulativeSpendingChart from '~/components/home/CumulativeSpendingChart.vue'

useHead({ title: 'Home | R&J Finance' })
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
ChartJS.register(Title, Tooltip, Legend, ArcElement)

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()
const { monthTitle } = useSelectedMonthTitle()
const UNCATEGORIZED_ICON = 'heroicons:question-mark-circle-solid'

onMounted(async () => {
  await store.ensureLoaded()
  resolveChartColors()
})

const baseTotalExpenses = computed(() =>
  store.budgetHits.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
)

const excludedExpenseIds = ref([])

const top10Expenses = computed(() => {
  return [...store.budgetHits]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 5)
    .map(h => {
      const budget = store.budgets.find(b => b.id === h.budget_id)
      return {
        ...h,
        budgetName: budget?.name ?? 'Uncategorized',
        budgetColor: budget?.color ?? null,
        budgetIconName: budget ? (budget.icon ?? budgetIcon(budget.name)) : UNCATEGORIZED_ICON,
      }
    })
})

 watch(top10Expenses, (hits) => {
  const validIds = new Set(hits.map(h => h.id))
  excludedExpenseIds.value = excludedExpenseIds.value.filter(id => validIds.has(id))
})

const excludedTop10Total = computed(() => {
  const excludedSet = new Set(excludedExpenseIds.value)
  return top10Expenses.value.reduce((sum, hit) => {
    if (!excludedSet.has(hit.id)) return sum
    return sum + (Number(hit.amount) || 0)
  }, 0)
})

const totalExpenses = computed(() => Math.max(baseTotalExpenses.value - excludedTop10Total.value, 0))

const totalIncome = computed(() =>
  store.income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

const hasData = computed(() => store.income.length > 0 || store.budgetHits.length > 0)

const remaining = computed(() => Math.max(totalIncome.value - totalExpenses.value, 0))

// ── month-over-month ─────────────────────────────────────────────────────────
const prevMonthTotalExpenses = computed(() =>
  store.prevMonthBudgetHits.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
)

const expenseMoMChange = computed(() => {
  if (prevMonthTotalExpenses.value === 0) return null
  return ((totalExpenses.value - prevMonthTotalExpenses.value) / prevMonthTotalExpenses.value) * 100
})

// ── daily average & projection ───────────────────────────────────────────────
const daysElapsed = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
  if (isCurrentMonth) return now.getDate()
  return new Date(year, month, 0).getDate()
})

const daysInMonth = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month, 0).getDate()
})

const daysRemaining = computed(() => {
  const { year, month } = store.selectedMonth
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
  if (!isCurrentMonth) return 0
  return daysInMonth.value - now.getDate()
})

const dailyAverage = computed(() =>
  daysElapsed.value > 0 ? totalExpenses.value / daysElapsed.value : 0
)

const projectedBalance = computed(() => {
  if (daysRemaining.value <= 0) return remaining.value
  const projectedTotalExpenses = dailyAverage.value * daysInMonth.value
  return totalIncome.value - projectedTotalExpenses
})

// ── gauge needle ─────────────────────────────────────────────────────────────
const needleAngle = computed(() => {
  const ratio = Math.min(totalExpenses.value / Math.max(totalIncome.value, 1), 1)
  return -90 + ratio * 180
})



function isExpenseExcluded(expenseId) {
  return excludedExpenseIds.value.includes(expenseId)
}

function toggleExpenseFromTotal(expenseId) {
  if (isExpenseExcluded(expenseId)) {
    excludedExpenseIds.value = excludedExpenseIds.value.filter(id => id !== expenseId)
    return
  }
  excludedExpenseIds.value = [...excludedExpenseIds.value, expenseId]
}

const chartColors = ref({ remaining: '#22c55e' })
const NO_BUDGET_COLOR = '#F3F4F6'   // light grey

const FALLBACK_PALETTE = [
  '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#10B981',
]

// Stripe pattern for the "No budget" arc
const noBudgetPattern = ref(null)

function makeStripePattern() {
  const tileSize = 6
  const resolution = 2
  const offscreen = document.createElement('canvas')
  offscreen.width = tileSize * resolution
  offscreen.height = tileSize * resolution
  const ctx2 = offscreen.getContext('2d')
  ctx2.scale(resolution, resolution)
  // Fill background
  ctx2.fillStyle = NO_BUDGET_COLOR
  ctx2.fillRect(0, 0, tileSize, tileSize)
  // Draw X pattern (two diagonal lines)
  ctx2.strokeStyle = '#D1D5DB'
  ctx2.lineWidth = 0.45
  ctx2.beginPath()
  ctx2.moveTo(0, 0)
  ctx2.lineTo(tileSize, tileSize)
  ctx2.moveTo(tileSize, 0)
  ctx2.lineTo(0, tileSize)
  ctx2.stroke()
  // Create a temporary canvas to get a rendering context for createPattern
  const host = document.createElement('canvas')
  const hostCtx = host.getContext('2d')
  return hostCtx.createPattern(offscreen, 'repeat')
}

function resolveChartColors() {
  const style = getComputedStyle(document.documentElement)
  const primary = style.getPropertyValue('--ui-primary').trim()
  if (primary) chartColors.value.remaining = primary
  noBudgetPattern.value = makeStripePattern()
}

const chartData = computed(() => {
  const excludedSet = new Set(excludedExpenseIds.value)

  // Compute per-budget totals (excluding any toggled-off top-5 hits)
  const budgetTotals = new Map()
  for (const h of store.budgetHits) {
    if (excludedSet.has(h.id)) continue
    const key = h.budget_id ?? '__none__'
    budgetTotals.set(key, (budgetTotals.get(key) ?? 0) + (Number(h.amount) || 0))
  }

  // Sort largest → smallest so the chart mirrors the stacked bar logic
  const sorted = [...budgetTotals.entries()].sort((a, b) => b[1] - a[1])

  let fallbackIdx = 0
  const labels = []
  const data = []
  const backgroundColors = []
  const borderColors = []
  const borderWidths = []

  for (const [budgetId, total] of sorted) {
    const budget = budgetId !== '__none__' ? store.budgets.find(b => b.id === budgetId) : null
    labels.push(budget?.name ?? 'No budget')
    data.push(total)
    if (budgetId === '__none__') {
      backgroundColors.push(noBudgetPattern.value ?? NO_BUDGET_COLOR)
      borderColors.push('transparent')
      borderWidths.push(0)
    } else {
      backgroundColors.push(budget?.color ?? FALLBACK_PALETTE[fallbackIdx++ % FALLBACK_PALETTE.length])
      borderColors.push('transparent')
      borderWidths.push(2)
    }
  }

  // Append the Remaining slice
  labels.push('Remaining')
  data.push(remaining.value)
  backgroundColors.push(chartColors.value.remaining)
  borderColors.push('transparent')
  borderWidths.push(2)

  return {
    labels,
    datasets: [{
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: borderWidths,
      data,
    }],
  }
})

const glowPlugin = {
  id: 'arcGlow',
  beforeDatasetsDraw(chart) {
    const ctx = chart.ctx
    ctx.save()
    ctx.shadowBlur = 15
    ctx.shadowColor = 'rgba(255,255,255,1)'
  },
  afterDatasetsDraw(chart) {
    chart.ctx.restore()
  },
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  circumference: 200,
  rotation: -100,
  radius:'90%',
  plugins: {
    legend: {
    display: false,
      position: 'bottom',
      labels: {
        font: { size: 14 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const value = ctx.parsed
          return ` $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
      },
    },
  },
}
</script>

<template>
  <div>
    <AppHeader title="Summary" />

    <UContainer>
        <template v-if="store.loading || hasData">
        <div class="flex flex-col items-center justify-center space-y-2">
            <h2 class="text-md text-center font-bold pt-3">Keep it steady, Jack</h2>
            <h2 class="text-sm text-center">You're on track to save some of your income.</h2>
            <div v-if="store.loading" class="w-full max-w-sm" style="height: 200px;">
                <USkeleton class="w-full h-full opacity-40" style="border-radius: 50% 50% 0 0 / 100% 100% 0 0;" />
            </div>

            <div v-else class="w-full max-w-sm relative" style="height: 200px;">
                <Doughnut :data="chartData" :options="chartOptions" />
                <GaugeNeedle :angle="needleAngle" :color="chartColors.expenses" />
            </div>

            <div class="flex gap-8 text-center">
                <div>
                    <p class="text-sm text-gray-400">Income</p>
                    <p class="text-lg font-semibold">${{ totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Expenses</p>
                    <p class="text-lg font-semibold text-warning">${{ totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</p>
                    <p v-if="expenseMoMChange !== null" class="text-xs mt-0.5" :class="expenseMoMChange > 0 ? 'text-red-400' : 'text-green-400'">
                        {{ expenseMoMChange > 0 ? '↑' : '↓' }} {{ Math.abs(expenseMoMChange).toFixed(1) }}% vs last mo.
                    </p>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Remaining</p>
                    <p class="text-lg font-semibold text-primary">${{ remaining.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</p>
                </div>
            </div>
            <!-- Insights row -->
            <div v-if="!store.loading" class="flex gap-6 text-center pt-1">
                <div>
                    <p class="text-xs text-gray-400">Daily Avg</p>
                    <p class="text-sm font-semibold">~${{ dailyAverage.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</p>
                </div>
                <div v-if="daysRemaining > 0">
                    <p class="text-xs text-gray-400">Projected (EOM)</p>
                    <p class="text-sm font-semibold" :class="projectedBalance >= 0 ? 'text-primary' : 'text-red-400'">
                        ${{ projectedBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}
                    </p>
                </div>
                <div v-else>
                    <p class="text-xs text-gray-400">Days in Month</p>
                    <p class="text-sm font-semibold">{{ daysInMonth }}</p>
                </div>
            </div>
        </div>

        <div class="pt-5 pb-20">
          <CumulativeSpendingChart />
        </div>

        </template>

        <div v-else class="flex flex-col items-center justify-center py-24 text-center gap-4">
            <UIcon name="heroicons:chart-bar" class="w-16 h-16 text-muted opacity-30" />
            <div>
                <p class="text-xl font-semibold text-highlighted">No data for {{ monthTitle }}</p>
                <p class="text-sm text-muted mt-1">Upload transactions or add income to get started.</p>
            </div>
        </div>

    </UContainer>
  </div>
</template>

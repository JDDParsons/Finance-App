<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useSavingsStore } from '~/stores/savings'
import { useBudgetIcon } from '~/composables/useBudgetIcon'

useHead({ title: 'Savings | R&J Finance' })
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
} from 'chart.js'

ChartJS.register(LineElement, BarElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

const financeStore = useFinanceStore()
const savingsStore = useSavingsStore()
const { budgetIcon } = useBudgetIcon()

function formatCurrency(value: number) {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
  return value < 0 ? `-${formatted}` : formatted
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// True when the user's selected month is the current real calendar month
const isCurrentRealMonth = computed(() => {
  const today = new Date()
  return (
    financeStore.selectedMonth.year === today.getFullYear() &&
    financeStore.selectedMonth.month === today.getMonth() + 1
  )
})

const currentMonthName = computed(() => MONTH_NAMES[financeStore.selectedMonth.month - 1])

// Reverse so chart reads oldest → newest (left → right)
// Exclude the current (incomplete) month from the chart when viewing the real current month
const chartMonths = computed(() => {
  const reversed = [...savingsStore.months].reverse()
  return isCurrentRealMonth.value ? reversed.slice(0, -1) : reversed
})

// Running cumulative total; null for months with no data (gap in line)
const cumulativeData = computed(() => {
  let running = 0
  return chartMonths.value.map(m => {
    if (!m.hasData) return null
    running += m.savings
    return running
  })
})

const chartData = computed(() => ({
  labels: chartMonths.value.map(m => m.label.split(' ')[0]),
  datasets: [
    {
      type: 'bar' as const,
      label: 'Monthly Savings',
      data: chartMonths.value.map(m => (m.hasData ? m.savings : null)),
      backgroundColor: chartMonths.value.map(m =>
        m.savings >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'
      ),
      borderColor: chartMonths.value.map(m =>
        m.savings >= 0 ? '#22c55e' : '#ef4444'
      ),
      borderWidth: 1,
      order: 2
    },
    {
      type: 'line' as const,
      label: 'Cumulative Savings',
      data: cumulativeData.value,
      borderColor: '#86efac',
      backgroundColor: 'rgba(134,239,172,0.1)',
      pointBackgroundColor: '#86efac',
      pointRadius: 4,
      tension: 0.3,
      fill: false,
      spanGaps: true,
      order: 1
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: { boxWidth: 12, padding: 16 }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          ctx.raw !== null
            ? `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
            : 'No data'
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false }
    },
    y: {
      ticks: { display: false },
      grid: {
        display: true,
        drawTicks: false,
        color: (ctx: any) => ctx.tick.value === 0 ? 'rgba(156,163,175,0.5)' : 'transparent'
      },
      border: { display: false }
    }
  }
}

// ── Savings breakdown (shown for past months) ────────────────────────────────

// Include budgets that have an allocation OR have actual spending
const breakdownBudgets = computed(() =>
  financeStore.budgets.filter(b =>
    (b.currentPeriod?.amount || 0) > 0 || (b.totalHitAmount || 0) > 0
  )
)

const totalIncome = computed(() =>
  financeStore.income.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
)

const totalBudgeted = computed(() =>
  breakdownBudgets.value.reduce((sum: number, b: any) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
)

// Income not committed to any budget
const unallocatedIncome = computed(() => totalIncome.value - totalBudgeted.value)

// Hits with no matching budget (truly unassigned or orphaned budget_id)
const unassignedSpent = computed(() => {
  const budgetIds = new Set(financeStore.budgets.map((b: any) => b.id))
  return financeStore.budgetHits
    .filter((h: any) => !h.budget_id || !budgetIds.has(h.budget_id))
    .reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0)
})

// Must equal income - allExpenses (verified: sum of per-budget spent + unassigned = all hits)
const totalSavings = computed(() =>
  totalIncome.value -
  breakdownBudgets.value.reduce((sum: number, b: any) => sum + (Number(b.totalHitAmount) || 0), 0) -
  unassignedSpent.value
)

onMounted(async () => {
  await financeStore.ensureLoaded()
  await savingsStore.fetchAll()
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 pb-24">
    <AppHeader title="Savings" />

    <div class="px-4 pt-4 flex flex-col gap-4">

      <!-- Savings chart -->
      <div class="h-64">
        <Bar :data="chartData" :options="chartOptions" />
      </div>

      <!-- Current-month notice -->
      <div
        v-if="isCurrentRealMonth"
        class="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start gap-3"
      >
        <UIcon name="heroicons-solid:information-circle" class="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <p class="text-sm text-blue-700 dark:text-blue-300">
          Savings for {{ currentMonthName }} aren't in yet. Check back at the end of the month!
        </p>
      </div>

      <!-- Savings breakdown (past months only) -->
      <template v-else>

        <!-- Loading skeleton -->
        <div v-if="financeStore.loading" class="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <USkeleton class="h-4 w-36 rounded" />
          </div>
          <div v-for="n in 4" :key="n" class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <USkeleton class="h-7 w-7 rounded-full shrink-0" />
            <div class="flex-1 space-y-1">
              <USkeleton class="h-3.5 w-32 rounded" />
              <USkeleton class="h-3 w-24 rounded" />
            </div>
            <USkeleton class="h-4 w-16 rounded" />
          </div>
        </div>

        <div v-else class="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow">

          <!-- Card header -->
          <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Savings Breakdown</h2>
          </div>

          <!-- Empty state -->
          <div
            v-if="breakdownBudgets.length === 0 && totalIncome === 0 && unassignedSpent === 0"
            class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500"
          >
            No budget data for this month.
          </div>

          <template v-else>

            <!-- Per-budget rows -->
            <div
              v-for="b in breakdownBudgets"
              :key="b.id"
              class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                :style="b.color ? `background: ${b.color}25` : 'background: rgba(156,163,175,0.15)'"
              >
                <UIcon
                  :name="b.icon || budgetIcon(b.name)"
                  class="w-4 h-4"
                  :style="b.color ? `color: ${b.color}` : 'color: #9ca3af'"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ b.name }}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  Spent {{ formatCurrency(b.totalHitAmount) }} of {{ formatCurrency(b.currentPeriod?.amount ?? 0) }}
                </p>
              </div>
              <span
                class="text-sm font-semibold shrink-0"
                :class="(b.totalRemainingAmount ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'"
              >
                {{ (b.totalRemainingAmount ?? 0) >= 0 ? '+' : '' }}{{ formatCurrency(b.totalRemainingAmount ?? 0) }}
              </span>
            </div>

            <!-- Unassigned expenses (no budget or orphaned budget_id) -->
            <div
              v-if="unassignedSpent !== 0"
              class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
            >
              <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center shrink-0">
                <UIcon name="heroicons:question-mark-circle-solid" class="w-4 h-4 text-gray-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100">Unassigned</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Expenses not linked to a budget</p>
              </div>
              <span
                class="text-sm font-semibold shrink-0"
                :class="unassignedSpent <= 0 ? 'text-green-500' : 'text-red-500'"
              >
                {{ unassignedSpent <= 0 ? '+' : '' }}{{ formatCurrency(-unassignedSpent) }}
              </span>
            </div>

            <!-- Unallocated income -->
            <div
              v-if="unallocatedIncome !== 0"
              class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
            >
              <div class="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                <UIcon name="heroicons:banknotes-solid" class="w-4 h-4 text-green-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {{ unallocatedIncome >= 0 ? 'Unallocated Income' : 'Over-allocated' }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ unallocatedIncome >= 0 ? 'Income not committed to a budget' : 'Budgeted more than income received' }}
                </p>
              </div>
              <span
                class="text-sm font-semibold shrink-0"
                :class="unallocatedIncome >= 0 ? 'text-green-500' : 'text-red-500'"
              >
                {{ unallocatedIncome >= 0 ? '+' : '' }}{{ formatCurrency(unallocatedIncome) }}
              </span>
            </div>

            <!-- Total -->
            <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800">
              <span class="text-sm font-bold text-gray-800 dark:text-gray-100">Total Saved</span>
              <span
                class="text-base font-bold"
                :class="totalSavings >= 0 ? 'text-green-500' : 'text-red-500'"
              >
                {{ totalSavings >= 0 ? '+' : '' }}{{ formatCurrency(totalSavings) }}
              </span>
            </div>

          </template>
        </div>

      </template>

    </div>
  </div>
</template>

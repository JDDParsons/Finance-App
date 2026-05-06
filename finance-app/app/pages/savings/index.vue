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
const chartSpan = ref(6)

const chartMonths = computed(() => {
  const sliced = savingsStore.months.slice(0, chartSpan.value)
  const reversed = [...sliced].reverse()
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
        m.savings >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(234,179,8,0.7)'
      ),
      borderColor: chartMonths.value.map(m =>
        m.savings >= 0 ? '#22c55e' : '#eab308'
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
      ticks: {
        display: true,
        callback: (value: any) => {
          const abs = Math.abs(value)
          const formatted = abs >= 1000 ? `$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K` : `$${abs}`
          return value < 0 ? `-${formatted}` : formatted
        },
        maxTicksLimit: 5,
        font: { size: 11 }
      },
      grid: {
        display: true,
        drawTicks: false,
        color: (ctx: any) => ctx.tick.value === 0 ? 'rgba(156,163,175,0.6)' : 'rgba(156,163,175,0.15)'
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

const overspentBudgets = computed(() =>
  breakdownBudgets.value.filter((b: any) => (Number(b.totalRemainingAmount) || 0) < 0)
)

const savedBudgets = computed(() =>
  breakdownBudgets.value.filter((b: any) => (Number(b.totalRemainingAmount) || 0) > 0)
)

const totalOverspent = computed(() =>
  overspentBudgets.value.reduce((sum: number, b: any) => sum + Math.abs(Number(b.totalRemainingAmount) || 0), 0)
)

const totalSavedByBudgets = computed(() =>
  savedBudgets.value.reduce((sum: number, b: any) => sum + (Number(b.totalRemainingAmount) || 0), 0)
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
const unassignedHits = computed(() => {
  const budgetIds = new Set(financeStore.budgets.map((b: any) => b.id))
  return financeStore.budgetHits
    .filter((h: any) => !h.budget_id || !budgetIds.has(h.budget_id))
})

const unassignedSpent = computed(() =>
  unassignedHits.value.reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0)
)

const totalUnbudgetedTransactions = computed(() => Math.max(unassignedSpent.value, 0))
const totalLeftoverIncome = computed(() => unallocatedIncome.value)

// Must equal income - allExpenses (verified: sum of per-budget spent + unassigned = all hits)
const totalSavings = computed(() =>
  totalIncome.value -
  breakdownBudgets.value.reduce((sum: number, b: any) => sum + (Number(b.totalHitAmount) || 0), 0) -
  unassignedSpent.value
)

const isBreakdownOpen = ref(true)

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
      <div class="flex flex-col gap-2">
        <div class="h-64">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <div class="flex justify-center gap-1">
          <button
            v-for="span in [3, 6, 12]"
            :key="span"
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-full transition-colors"
            :class="chartSpan === span
              ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'"
            @click="chartSpan = span"
          >
            {{ span }}M
          </button>
        </div>
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

          <!-- Expandable breakdown header -->
          <button
            type="button"
            class="w-full px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-left"
            @click="isBreakdownOpen = !isBreakdownOpen"
          >
            <span class="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <UIcon name="heroicons:banknotes" class="w-4 h-4" />
                Savings Breakdown
              </span>
            <UIcon
              name="heroicons:chevron-down-20-solid"
              class="w-5 h-5 text-gray-500 transition-transform"
              :class="isBreakdownOpen ? 'rotate-180' : ''"
            />
          </button>

          <!-- Top-level categories -->
          <div class="border-b border-gray-100 dark:border-gray-800">
            <!-- Unbudgeted transactions -->
            <div class="w-full flex items-center gap-3 pl-6 pr-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Unbudgeted Transactions</p>
              </div>
              <span class="text-sm font-semibold shrink-0 text-yellow-500">
                {{ totalUnbudgetedTransactions > 0 ? '-' : '' }}{{ formatCurrency(totalUnbudgetedTransactions) }}
              </span>
            </div>
            <div v-if="isBreakdownOpen" class="border-b border-gray-100 dark:border-gray-800">
              <div v-if="unassignedHits.length === 0" class="pl-8 pr-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                No unbudgeted transactions.
              </div>
              <div
                v-for="h in unassignedHits"
                :key="h.id"
                class="flex items-center gap-3 pl-8 pr-4 py-2.5 border-b border-gray-50 dark:border-gray-800/60 last:border-b-0"
              >
                <div class="w-7 h-7 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center shrink-0">
                  <UIcon name="heroicons:question-mark-circle" class="w-4 h-4 text-yellow-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{{ h.note || 'No description' }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">{{ h.date }}</p>
                </div>
                <span class="text-sm font-medium shrink-0 text-yellow-400">
                  -{{ formatCurrency(Number(h.amount)) }}
                </span>
              </div>
            </div>

            <!-- Overspending -->
            <div class="w-full flex items-center gap-3 pl-6 pr-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Budget Overspending</p>
              </div>
              <span class="text-sm font-semibold shrink-0 text-yellow-500">
                {{ totalOverspent > 0 ? '-' : '' }}{{ formatCurrency(totalOverspent) }}
              </span>
            </div>
            <div v-if="isBreakdownOpen" class="border-b border-gray-100 dark:border-gray-800">
              <div v-if="overspentBudgets.length === 0" class="pl-8 pr-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                No overspent budgets.
              </div>
              <div
                v-for="b in overspentBudgets"
                :key="`over-${b.id}`"
                class="flex items-center gap-3 pl-8 pr-4 py-3"
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
                  <p class="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{{ b.name }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    Spent {{ formatCurrency(b.totalHitAmount) }} of {{ formatCurrency(b.currentPeriod?.amount ?? 0) }}
                  </p>
                </div>
                <span class="text-sm font-medium shrink-0 text-yellow-400">
                  {{ formatCurrency(b.totalRemainingAmount ?? 0) }}
                </span>
              </div>
            </div>

            <!-- Budget savings -->
            <div class="w-full flex items-center gap-3 pl-6 pr-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Budget Savings</p>
              </div>
              <span class="text-sm font-semibold shrink-0 text-green-500">
                {{ totalSavedByBudgets > 0 ? '+' : '' }}{{ formatCurrency(totalSavedByBudgets) }}
              </span>
            </div>
            <div v-if="isBreakdownOpen" class="border-b border-gray-100 dark:border-gray-800">
              <div v-if="savedBudgets.length === 0" class="pl-8 pr-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                No budget savings.
              </div>
              <div
                v-for="b in savedBudgets"
                :key="`saved-${b.id}`"
                class="flex items-center gap-3 pl-8 pr-4 py-3"
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
                  <p class="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{{ b.name }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    Spent {{ formatCurrency(b.totalHitAmount) }} of {{ formatCurrency(b.currentPeriod?.amount ?? 0) }}
                  </p>
                </div>
                <span class="text-sm font-medium shrink-0 text-green-400">
                  +{{ formatCurrency(b.totalRemainingAmount ?? 0) }}
                </span>
              </div>
            </div>

            <!-- Leftover income -->
            <div class="w-full flex items-center gap-3 pl-6 pr-4 py-3 text-left">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Leftover Income</p>
              </div>
              <span
                class="text-sm font-semibold shrink-0"
                :class="totalLeftoverIncome >= 0 ? 'text-green-500' : 'text-yellow-500'"
              >
                {{ totalLeftoverIncome >= 0 ? '+' : '' }}{{ formatCurrency(totalLeftoverIncome) }}
              </span>
            </div>
          </div>

          <!-- Total stays visible at bottom -->
          <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <span class="text-sm font-bold text-gray-800 dark:text-gray-100">Total Saved</span>
            <span
              class="text-base font-bold"
              :class="totalSavings >= 0 ? 'text-green-500' : 'text-yellow-500'"
            >
              {{ totalSavings >= 0 ? '+' : '' }}{{ formatCurrency(totalSavings) }}
            </span>
          </div>
        </div>

      </template>

    </div>
  </div>
</template>

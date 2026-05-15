<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useSavingsStore } from '~/stores/savings'
import { useSavingsTrend } from '~/composables/useSavingsTrend'

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
  if (!isCurrentRealMonth.value) return reversed
  // Mark the last entry as pending and substitute unallocated income as the projected savings
  return reversed.map((m: any, i: number) =>
    i === reversed.length - 1
      ? { ...m, isPending: true, savings: unallocatedIncome.value }
      : m
  )
})

// Running cumulative total; null for months with no data (gap in line)
const cumulativeData = computed(() => {
  let running = 0
  return chartMonths.value.map((m: any) => {
    if (!m.hasData) return null
    running += m.savings
    return running
  })
})

const chartData = computed(() => ({
  labels: chartMonths.value.map((m: any) => m.label.split(' ')[0]),
  datasets: [
    {
      type: 'bar' as const,
      label: 'Monthly Savings',
      data: chartMonths.value.map((m: any) => m.hasData ? m.savings : null),
      backgroundColor: chartMonths.value.map((m: any) =>
        m.savings >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(234,179,8,0.7)'
      ),
      borderColor: chartMonths.value.map((m: any) =>
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

// Plugin: draws diagonal stripes over the current (pending) month's bar
const currentMonthOverlayPlugin = {
  id: 'currentMonthOverlay',
  afterDraw(chart: any) {
    if (!isCurrentRealMonth.value) return
    const meta = chart.getDatasetMeta(0)
    if (!meta?.data?.length) return
    const bar = meta.data[meta.data.length - 1]
    if (!bar) return
    const { ctx } = chart
    const bx = bar.x
    const bw = bar.width ?? 0
    const top = Math.min(bar.y, bar.base)
    const height = Math.abs(bar.base - bar.y)
    if (height < 1) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(bx - bw / 2, top, bw, height)
    ctx.clip()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 3
    const spacing = 7
    for (let i = -(height + bw); i < bw + height; i += spacing) {
      ctx.beginPath()
      ctx.moveTo(bx - bw / 2 + i, top)
      ctx.lineTo(bx - bw / 2 + i + height, top + height)
      ctx.stroke()
    }
    ctx.restore()
  }
}

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

// ── Savings breakdown ────────────────────────────────────────────────────────

const totalIncome = computed(() =>
  financeStore.income.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
)

const totalBudgeted = computed(() =>
  financeStore.budgets
    .filter((b: any) => (b.currentPeriod?.amount || 0) > 0 || (b.totalHitAmount || 0) > 0)
    .reduce((sum: number, b: any) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
)

// Income not committed to any budget (used for current-month projected savings in chart)
const unallocatedIncome = computed(() => totalIncome.value - totalBudgeted.value)

const isSlideoverOpen = ref(false)

// Net savings note for the chart's visible range (excludes current pending month)
const chartSummaryNote = computed(() => {
  const allMonths = chartMonths.value.filter((m: any) => m.hasData)
  if (allMonths.length === 0) return null
  const total = allMonths.reduce((s: number, m: any) => s + m.savings, 0)
  // Use oldest non-pending month for the "since" label when possible
  const oldest = allMonths.find((m: any) => !m.isPending) ?? allMonths[0]
  const currentYear = new Date().getFullYear()
  const since = oldest.year === currentYear
    ? MONTH_NAMES[oldest.month - 1]
    : `${MONTH_NAMES[oldest.month - 1]} ${oldest.year}`
  const amt = '$' + Math.abs(total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const positive = total >= 0

  if (isCurrentRealMonth.value) {
    const currentFull = MONTH_NAMES[financeStore.selectedMonth.month - 1]
    return positive
      ? { prefix: `Based on your budgets, you could save around `, amount: amt, suffix: ` from ${since} through end of ${currentFull}`, positive }
      : { prefix: `You're on track to overspend `, amount: amt, suffix: ` since ${since} through end of ${currentFull}`, positive }
  }

  return positive
    ? { prefix: "You saved ", amount: amt, suffix: ` from ${since}`, positive }
    : { prefix: "You overspent ", amount: amt, suffix: ` from ${since}`, positive }
})

const { savingsTrend } = useSavingsTrend(chartMonths)

const compoundProjection = computed(() => {
  const allMonths = chartMonths.value.filter((m: any) => m.hasData)
  if (allMonths.length === 0) return null
  const total = allMonths.reduce((s: number, m: any) => s + m.savings, 0)
  if (total <= 0) return null
  const future = total * Math.pow(1.07, 10)
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
  return {
    principal: fmt(total),
    future: fmt(future),
    growth: fmt(future - total),
  }
})

onMounted(async () => {
  await financeStore.ensureLoaded()
  await savingsStore.ensureLoaded()
})
</script>

<template>
  <div class="min-h-screen">
    <AppHeader title="Savings" />

    <UContainer>
    <div class="pt-4 pb-24 lg:pb-6 flex flex-col gap-1">

      <!-- Savings trend summary -->
      <div class="flex flex-col items-center text-center gap-1 pt-1">
        <p
          class="text-sm font-semibold"
          :class="savingsTrend.tone === 'positive' ? 'text-green-500' : savingsTrend.tone === 'warning' ? 'text-yellow-500' : 'text-gray-400'"
        >{{ savingsTrend.headline }}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 max-w-xs">{{ savingsTrend.subtitle }}</p>
      </div>

      <!-- Savings chart -->
      <div class="flex flex-col gap-1">
        <div class="h-64 lg:h-96">
          <USkeleton v-if="savingsStore.loading" class="w-full h-full rounded-xl" />
          <Bar v-else :data="chartData" :options="chartOptions" :plugins="[currentMonthOverlayPlugin]" />
        </div>
        <div class="flex justify-center gap-1">
          <button
            v-for="span in [3, 6, 12]"
            :key="span"
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-full transition-colors"
            :class="chartSpan === span
              ? 'bg-green-500/15 border border-green-500 text-green-500'
              : 'border border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'"
            @click="chartSpan = span"
          >
            {{ span }}M
          </button>
        </div>
        <p v-if="chartSummaryNote" class="text-center text-sm text-gray-400 dark:text-gray-500 mt-1">
          {{ chartSummaryNote.prefix }}<span :class="chartSummaryNote.positive ? 'text-green-500' : 'text-yellow-500'" class="font-semibold">{{ chartSummaryNote.amount }}</span>{{ chartSummaryNote.suffix }}.
        </p>
        <div class="flex justify-center mt-2">
          <button
            type="button"
            class="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full text-blue-500 border border-blue-500/40 hover:bg-blue-500/10 transition-colors"
            @click="isSlideoverOpen = true"
          >
            <UIcon name="heroicons:banknotes" class="w-4 h-4" />
            View Breakdown
          </button>
        </div>
      </div>

      <!-- 10-year compound interest projection -->
      <div v-if="compoundProjection" class="flex flex-col items-center mt-2 gap-2">
        <p class="text-xs text-gray-400 dark:text-gray-500 text-center">If you invested these savings today...</p>
        <div class="relative flex items-center justify-center w-36 h-36 rounded-full bg-green-500/10 border-4 border-green-500/60">
          <div class="flex flex-col items-center gap-0.5">
            <span class="text-2xl font-bold text-green-500 leading-tight">{{ compoundProjection.future }}</span>
            <span class="text-xs text-green-400/80 font-medium">in 10 years</span>
          </div>
        </div>
        <div class="flex flex-col items-center gap-1 text-center">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300">{{ compoundProjection.principal }}</span> growing at 7% annual compound return
          </p>
          <p class="text-md text-gray-400 dark:text-gray-500">
            That's <span class="text-green-500 font-medium">{{ compoundProjection.growth }}</span> in interest alone!
          </p>
        </div>
      </div>

      <!-- Savings breakdown slideover -->
      <USlideover v-model:open="isSlideoverOpen" class="w-full sm:max-w-md">
        <template #content>
          <div class="flex flex-col h-full">
            <div class="flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700" style="padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: 1rem;">
              <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">{{ currentMonthName }} Breakdown</h3>
              <button
                type="button"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                @click="isSlideoverOpen = false"
              >
                <UIcon name="heroicons:x-mark" class="w-5 h-5" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <SavingsBreakdownByBudget />
            </div>
          </div>
        </template>
      </USlideover>

    </div>
    </UContainer>
  </div>
</template>

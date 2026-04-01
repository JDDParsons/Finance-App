<script setup>
import { signOut } from '~/composables/supabase'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
ChartJS.register(Title, Tooltip, Legend, ArcElement)

const store = useFinanceStore()

onMounted(() => {
  resolveChartColors()
})

const baseTotalExpenses = computed(() =>
  store.budgetHits.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
)

const excludedExpenseIds = ref([])

const excludedTop5Total = computed(() => {
  const excludedSet = new Set(excludedExpenseIds.value)
  return top5Expenses.value.reduce((sum, hit) => {
    if (!excludedSet.has(hit.id)) return sum
    return sum + (Number(hit.amount) || 0)
  }, 0)
})

const totalExpenses = computed(() => Math.max(baseTotalExpenses.value - excludedTop5Total.value, 0))

const totalIncome = computed(() =>
  store.income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

const remaining = computed(() => Math.max(totalIncome.value - totalExpenses.value, 0))

const top5Expenses = computed(() => {
  return [...store.budgetHits]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 5)
    .map(h => {
      const budget = store.budgets.find(b => b.id === h.budget_id)
      return {
        ...h,
        budgetName: budget?.name ?? 'Uncategorized',
      }
    })
})

watch(top5Expenses, (hits) => {
  const validIds = new Set(hits.map(h => h.id))
  excludedExpenseIds.value = excludedExpenseIds.value.filter(id => validIds.has(id))
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

const monthLabel = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
})

const chartColors = ref({ expenses: '#ef4444', remaining: '#22c55e' })

function resolveChartColors() {
  const style = getComputedStyle(document.documentElement)
  const error = style.getPropertyValue('--ui-warning').trim()
  const primary = style.getPropertyValue('--ui-primary').trim()
  if (error) chartColors.value.expenses = error
  if (primary) chartColors.value.remaining = primary
}

const chartData = computed(() => ({
  labels: ['Expenses', 'Remaining'],
  datasets: [
    {
      backgroundColor: [chartColors.value.expenses, chartColors.value.remaining],
      borderWidth: 2,
      data: [totalExpenses.value, remaining.value],
    },
  ],
}))

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
  cutout: '85%',
  circumference: 180,
  rotation: -90,
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
    <UContainer>

        <!---->
        <MonthSelector />

        
        <!-- Header -->
        <div class="relative flex items-center justify-center pt-2 mb-2">
            <h2 class="text-3xl font-bold">Monthly Summary</h2>
        </div>


        <div class="flex flex-col items-center justify-center pt-2 space-y-2">
            <h2 class="text-2xl font-bold">Balance</h2>

            <div v-if="store.loading" class="w-full max-w-sm" style="height: 200px;">
                <USkeleton class="w-full h-full" style="border-radius: 50% 50% 0 0 / 100% 100% 0 0;" />
            </div>

            <div v-else class="w-full max-w-sm" style="height: 200px;">
                <Doughnut :data="chartData" :options="chartOptions" :plugins="[glowPlugin]" />
            </div>

            <div class="flex gap-8 text-center">
                <div>
                    <p class="text-sm text-gray-400">Income</p>
                    <p class="text-lg font-semibold">${{ totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Expenses</p>
                    <p class="text-lg font-semibold text-warning">${{ totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Remaining</p>
                    <p class="text-lg font-semibold text-primary">${{ remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                </div>
            </div>
        </div>

        <USeparator class="my-8" />
        
            <!-- Largest Expenses -->
            <div class="w-full mt-8 pb-20">
                <h2 class="text-2xl text-center font-bold pb-2">Largest Expenses</h2>
                <ul v-if="store.loading" class="space-y-2">
                    <li
                        v-for="n in 5"
                        :key="n"
                        class="flex items-center justify-between rounded-lg px-4 py-3 bg-elevated"
                    >
                        <div class="flex items-center gap-3">
                            <USkeleton class="w-4 h-4 rounded" />
                            <div class="space-y-1.5">
                                <USkeleton class="h-3.5 w-28 rounded" />
                                <USkeleton class="h-3 w-20 rounded" />
                            </div>
                        </div>
                        <USkeleton class="h-4 w-16 rounded" />
                    </li>
                </ul>
                <ul v-else class="space-y-2">
                    <li
                        v-for="(hit, i) in top5Expenses"
                        :key="hit.id"
                      class="flex items-center justify-between rounded-lg px-4 py-3 bg-elevated cursor-pointer transition-opacity"
                      :class="{ 'opacity-50': isExpenseExcluded(hit.id) }"
                      @click="toggleExpenseFromTotal(hit.id)"
                    >
                        <div class="flex items-center gap-3">
                            <span class="text-sm text-muted w-4">{{ i + 1 }}</span>
                            <div>
                                <p class="font-medium text-sm">{{ hit.budgetName }}</p>
                                <p class="text-xs text-muted">{{ hit.note || '—' }}</p>
                            </div>
                        </div>
                        <p class="font-semibold text-warning text-sm">${{ Number(hit.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                    </li>
                    <li v-if="top5Expenses.length === 0" class="text-sm text-muted text-center py-4">No expenses this month.</li>
                </ul>
            </div>
    </UContainer>
</template>

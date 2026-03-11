<script setup>
import { signOut } from '../composables/supabase'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
ChartJS.register(Title, Tooltip, Legend, ArcElement)

const store = useFinanceStore()

onMounted(() => {
  resolveChartColors()
})

const totalExpenses = computed(() =>
  store.budgetHits.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
)

const totalIncome = computed(() =>
  store.income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

const remaining = computed(() => Math.max(totalIncome.value - totalExpenses.value, 0))

const top5Expenses = computed(() => {
  return [...store.budgetHits]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 6)
    .map(h => {
      const budget = store.budgets.find(b => b.id === h.budget_id)
      return {
        ...h,
        budgetName: budget?.name ?? 'Uncategorized',
      }
    })
})

const monthLabel = computed(() => {
  const { year, month } = store.selectedMonth
  return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
})

const chartColors = ref({ expenses: '#ef4444', remaining: '#22c55e' })

function resolveChartColors() {
  const style = getComputedStyle(document.documentElement)
  const error = style.getPropertyValue('--ui-error').trim()
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
  cutout: '80%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20,
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

            <div v-if="store.loading" class="text-gray-400 text-sm">Loading...</div>

            <div v-else class="w-full max-w-sm" style="height: 320px;">
                <Doughnut :data="chartData" :options="chartOptions" :plugins="[glowPlugin]" />
            </div>

            <div class="flex gap-8 text-center">
                <div>
                    <p class="text-sm text-gray-400">Income</p>
                    <p class="text-lg font-semibold">${{ totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Expenses</p>
                    <p class="text-lg font-semibold text-error">${{ totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Remaining</p>
                    <p class="text-lg font-semibold text-primary">${{ remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                </div>
            </div>
        </div>

            <!-- Largest Expenses -->
            <div class="w-full mt-8">
                <h2 class="text-2xl text-center font-bold pb-2">Largest Expenses</h2>
                <div v-if="store.loading" class="text-gray-400 text-sm">Loading...</div>
                <ul v-else class="space-y-2">
                    <li
                        v-for="(hit, i) in top5Expenses"
                        :key="hit.id"
                        class="flex items-center justify-between rounded-lg px-4 py-3 bg-elevated"
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

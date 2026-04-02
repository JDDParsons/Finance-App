<script setup>
const store = useFinanceStore()

const totalIncome = computed(() =>
  store.income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

// budgets that have a period allocation set this month
const activeBudgets = computed(() =>
  store.budgets.filter(b => (b.currentPeriod?.amount || 0) > 0)
)

const totalBudgeted = computed(() =>
  activeBudgets.value.reduce((sum, b) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
)

const totalSpent = computed(() =>
  activeBudgets.value.reduce((sum, b) => sum + (Number(b.totalHitAmount) || 0), 0)
)

const percentIncomeBudgeted = computed(() =>
  totalIncome.value > 0 ? (totalBudgeted.value / totalIncome.value) * 100 : 0
)

const remainingFunds = computed(() =>
  totalIncome.value - totalBudgeted.value
)

// top 5 by allocation amount
const top5Budgets = computed(() =>
  [...activeBudgets.value]
    .sort((a, b) => (Number(b.currentPeriod?.amount) || 0) - (Number(a.currentPeriod?.amount) || 0))
    .slice(0, 5)
)
</script>

<template>
  <div class="rounded-xl border border-default bg-elevated p-5 flex flex-col gap-4">
    <h2 class="text-xl font-bold">Budget Summary</h2>

    <!-- skeleton -->
    <template v-if="store.loading">
      <div class="grid grid-cols-2 gap-3">
        <USkeleton v-for="n in 4" :key="n" class="h-14 rounded-lg" />
      </div>
      <div class="space-y-2">
        <USkeleton v-for="n in 5" :key="n" class="h-10 rounded-lg" />
      </div>
    </template>

    <template v-else>
      <!-- Stats grid -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg bg-default p-3">
          <p class="text-xs text-gray-400 mb-0.5">Active Budgets</p>
          <p class="text-xl font-bold">{{ activeBudgets.length }}</p>
        </div>
        <div class="rounded-lg bg-default p-3">
          <p class="text-xs text-gray-400 mb-0.5">% Income Budgeted</p>
          <p class="text-xl font-bold" :class="percentIncomeBudgeted > 100 ? 'text-red-400' : 'text-primary'">
            {{ percentIncomeBudgeted.toFixed(0) }}%
          </p>
        </div>
        <div class="rounded-lg bg-default p-3">
          <p class="text-xs text-gray-400 mb-0.5">Total Budgeted</p>
          <p class="text-xl font-bold">${{ totalBudgeted.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}</p>
        </div>
        <div class="rounded-lg bg-default p-3">
          <p class="text-xs text-gray-400 mb-0.5">Remaining Funds</p>
          <p class="text-xl font-bold" :class="remainingFunds < 0 ? 'text-red-400' : remainingFunds === 0 ? 'text-warning' : 'text-primary'">
            ${{ remainingFunds.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
          </p>
        </div>
      </div>

      <!-- Top 5 budgets -->
      <div>
        <p class="text-xs text-gray-400 mb-2">Top Allocations</p>
        <ul class="space-y-2">
          <li
            v-for="budget in top5Budgets"
            :key="budget.id"
            class="flex items-center gap-3 rounded-lg bg-default px-3 py-2"
          >
            <!-- colour swatch -->
            <span
              class="shrink-0 w-3 h-3 rounded-full"
              :style="budget.color ? `background: ${budget.color}` : 'background: var(--ui-color-gray-400)'"
            ></span>
            <span class="text-sm font-medium flex-1 truncate">{{ budget.name }}</span>
            <span class="text-sm font-semibold shrink-0">${{ Number(budget.currentPeriod?.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }}</span>
          </li>
          <li v-if="top5Budgets.length === 0" class="text-sm text-muted text-center py-2">No budgets set.</li>
        </ul>
      </div>
    </template>
  </div>
</template>

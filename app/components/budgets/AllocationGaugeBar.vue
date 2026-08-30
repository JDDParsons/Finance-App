<script setup>
const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

const store = useFinanceStore()

const totalBudgetedIncome = computed(() =>
  store.incomeBudgets.reduce((sum, budget) => sum + (Number(budget.currentPeriod?.amount) || 0), 0)
)

const totalAllocated = computed(() =>
  store.budgets.reduce((sum, b) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
)

const pctOfIncome = computed(() => {
  if (!totalBudgetedIncome.value) return null
  return Math.round((totalAllocated.value / totalBudgetedIncome.value) * 100)
})

const remaining = computed(() => totalBudgetedIncome.value - totalAllocated.value)
const pctRemaining = computed(() => {
  if (!totalBudgetedIncome.value) return null
  return Math.round((remaining.value / totalBudgetedIncome.value) * 100)
})

const isOver = computed(() => totalAllocated.value > totalBudgetedIncome.value)

// Sort largest first so the gauge reads left-to-right big-to-small
const sortedBudgets = computed(() =>
  [...store.budgets].sort((a, b) =>
    (Number(b.currentPeriod?.amount) || 0) - (Number(a.currentPeriod?.amount) || 0)
  )
)

// Each segment as a % of income (capped so total never exceeds 100% visually)
const segments = computed(() => {
  if (!totalBudgetedIncome.value) return []
  const base = Math.max(totalBudgetedIncome.value, totalAllocated.value)
  let remaining = 100
  return sortedBudgets.value.map((b, i) => {
    const pct = Math.min(((Number(b.currentPeriod?.amount) || 0) / base) * 100, remaining)
    remaining -= pct
    return {
      id: b.id,
      name: b.name,
      pct,
      color: b.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }
  })
})

function formatUSD(val) {
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
</script>

<template>
  <UPopover :content="{ align: 'center' }">
    <button
      type="button"
      class="w-full cursor-pointer rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label="View budget allocation breakdown"
      :disabled="store.loading"
    >
      <USkeleton v-if="store.loading" class="w-full rounded-full" style="height: 20px;" />
      <template v-else>
        <!-- Labels -->
        <div class="flex justify-between items-baseline mb-1.5 px-0.5">
          <p class="text-xs font-semibold text-muted">
            Budget allocation
          </p>
          <p class="text-xs font-bold" :class="isOver ? 'text-error' : 'text-muted'">
            <span v-if="isOver" class="inline-flex items-center gap-1">
              <UIcon name="heroicons:exclamation-triangle" class="size-3.5 shrink-0" />
              Over budget by {{ formatUSD(Math.abs(remaining)) }}
            </span>
            <span v-else-if="pctRemaining !== null">{{ formatUSD(remaining) }} remaining ({{ pctRemaining }}%)</span>
            <span v-else>{{ formatUSD(totalAllocated) }} allocated</span>
          </p>
        </div>

        <!-- Gauge track -->
        <div class="relative w-full h-4 rounded-full overflow-hidden bg-white/30 dark:bg-white/10 border border-gray-300 dark:border-gray-600">
          <!-- Budget segments -->
          <div class="absolute inset-0 flex h-full">
            <div
              v-for="seg in segments"
              :key="seg.id"
              class="h-full transition-all duration-500"
              :style="{
                width: `${seg.pct}%`,
                backgroundColor: `${seg.color}40`,
              }"
            />
          </div>

          <!-- Over-budget overflow indicator -->
          <div
            v-if="isOver"
            class="absolute right-0 top-0 h-full w-1.5 rounded-r-full bg-red-500/70"
          />
        </div>
      </template>
    </button>

    <template #content>
      <div class="grid w-72 grid-cols-2 gap-3 p-3">
        <div class="rounded-lg bg-elevated p-2">
          <p class="mb-0.5 text-xs text-gray-400">Budgeted Income</p>
          <p class="text-lg font-bold">{{ formatUSD(totalBudgetedIncome) }}</p>
        </div>
        <div class="rounded-lg bg-elevated p-2">
          <p class="mb-0.5 text-xs text-gray-400">% Income Allocated</p>
          <p class="text-lg font-bold" :class="isOver ? 'text-red-400' : 'text-primary'">
            {{ pctOfIncome ?? 0 }}%
          </p>
        </div>
        <div class="rounded-lg bg-elevated p-2">
          <p class="mb-0.5 text-xs text-gray-400">Total Budgeted</p>
          <p class="text-lg font-bold">{{ formatUSD(totalAllocated) }}</p>
        </div>
        <div class="rounded-lg bg-elevated p-2">
          <p class="mb-0.5 text-xs text-gray-400">Remaining Funds</p>
          <p
            class="text-lg font-bold"
            :class="remaining < 0 ? 'text-red-400' : remaining === 0 ? 'text-warning' : 'text-primary'"
          >
            {{ formatUSD(remaining) }}
          </p>
        </div>
      </div>
    </template>
  </UPopover>
</template>

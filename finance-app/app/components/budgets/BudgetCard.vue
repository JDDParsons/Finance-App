<script setup lang="ts">
interface BudgetCardBudget {
  id: string
  name: string
  color?: string | null
  icon?: string | null
  currentPeriod?: {
    amount?: number | null
  } | null
  totalHitAmount?: number | null
}

const props = defineProps<{
  budget: BudgetCardBudget
}>()

const emit = defineEmits<{
  select: [budgetId: string]
}>()

const { budgetIcon } = useBudgetIcon()

const budgetAmount = computed(() => Number(props.budget.currentPeriod?.amount) || 0)
const spentAmount = computed(() => Number(props.budget.totalHitAmount) || 0)
const spentPercent = computed(() => {
  if (budgetAmount.value <= 0) return 0
  return (spentAmount.value / budgetAmount.value) * 100
})
const accentColor = computed(() => props.budget.color || '#34d399')
const iconName = computed(() => props.budget.icon ?? budgetIcon(props.budget.name))

// Bar width resets each 100% tier: 0-100 → green, 100-200 → yellow, 200+ → red
const barWidth = computed(() => {
  if (spentPercent.value > 200) return Math.min(spentPercent.value - 200, 100)
  if (spentPercent.value > 100) return spentPercent.value - 100
  return Math.min(spentPercent.value, 100)
})

const barColor = computed(() => {
  if (spentPercent.value > 200) return '#ef4444'
  if (spentPercent.value > 100) return '#eab308'
  return '#22c55e'
})

// Track background upgrades to the previous tier's fill color once exceeded
const trackStyle = computed(() => {
  if (spentPercent.value > 200) return { backgroundColor: '#eab308' }
  if (spentPercent.value > 100) return { backgroundColor: '#22c55e' }
  return {}
})

const cardStyle = computed(() => ({
  backgroundColor: `${accentColor.value}12`,
  borderColor: `${accentColor.value}26`
}))

const iconWrapperStyle = computed(() => ({
  backgroundColor: `${accentColor.value}1f`,
  color: accentColor.value
}))

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>

<template>
  <button
    type="button"
    class="group relative flex min-h-32 w-full flex-col items-center overflow-hidden rounded-2xl border px-4 pt-4 pb-5 text-center shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    :style="cardStyle"
    :aria-label="`Open ${budget.name} budget`"
    @click="emit('select', budget.id)"
  >
    <p class="line-clamp-2 text-sm font-semibold text-gray-700 dark:text-gray-100">
      {{ budget.name }}
    </p>

    <div
      class="mt-1 flex size-10 items-center justify-center rounded-full ring-2 ring-white/70 dark:ring-white/10"
      :style="iconWrapperStyle"
    >
      <UIcon :name="iconName" class="size-5" />
    </div>

    <p class="mt-1 mb-1 font-bold tracking-tight text-gray-900 dark:text-white">
      {{ formatCurrency(budgetAmount) }}
    </p>

    <div class="absolute inset-x-4 bottom-3 h-1.5 overflow-hidden rounded-full bg-white/65 dark:bg-black/15" :style="trackStyle">
      <div
        class="h-full rounded-full transition-all duration-500"
        :style="{ width: `${barWidth}%`, backgroundColor: barColor }"
      />
    </div>
  </button>
</template>

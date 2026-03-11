<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const store = useFinanceStore()

const totalAllocated = computed(() =>
  store.budgets.reduce((sum, b) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
)

const totalIncome = computed(() =>
  store.income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

const unallocated = computed(() => Math.max(totalIncome.value - totalAllocated.value, 0))

const overAllocated = computed(() => totalAllocated.value > totalIncome.value)

const chartColors = ref({ allocated: '#6366f1', unallocated: '#22c55e', over: '#ef4444' })

onMounted(() => {
  const style = getComputedStyle(document.documentElement)
  const primary = style.getPropertyValue('--ui-primary').trim()
  const error = style.getPropertyValue('--ui-error').trim()
  if (primary) chartColors.value.allocated = primary
  if (error) chartColors.value.over = error
})

const chartData = computed(() => ({
  labels: [''],
  datasets: overAllocated.value
    ? [
        {
          label: 'Allocated',
          data: [totalIncome.value],
          backgroundColor: chartColors.value.allocated,
          borderRadius: 4,
          barThickness: 28,
        },
        {
          label: 'Over budget',
          data: [totalAllocated.value - totalIncome.value],
          backgroundColor: chartColors.value.over,
          borderRadius: 4,
          barThickness: 28,
        },
      ]
    : [
        {
          label: 'Allocated',
          data: [totalAllocated.value],
          backgroundColor: chartColors.value.allocated,
          borderRadius: 4,
          barThickness: 28,
        },
        {
          label: 'Unallocated',
          data: [unallocated.value],
          backgroundColor: chartColors.value.unallocated,
          borderRadius: 4,
          barThickness: 28,
        },
      ],
}))

const chartOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      display: false,
      max: Math.max(totalIncome.value, totalAllocated.value),
    },
    y: {
      stacked: true,
      display: false,
    },
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 16,
        font: { size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) =>
          ` ${ctx.dataset.label}: $${ctx.parsed.x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
  },
}))
</script>

<template>
  <div class="w-full">
    <div class="flex justify-between text-xs text-muted mb-1 px-0.5">
      <span>Allocated: ${{ totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</span>
      <span :class="overAllocated ? 'text-error font-semibold' : ''">
        {{ overAllocated
          ? `Over by $${(totalAllocated - totalIncome).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : `Unallocated: $${unallocated.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` }}
      </span>
    </div>
    <USkeleton v-if="store.loading" class="w-full rounded" style="height: 80px;" />
    <div v-else style="height: 80px;">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

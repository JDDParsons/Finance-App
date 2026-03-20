<script setup lang="ts">
import { useFinanceStore } from '../../stores/finance'
import { useSavingsStore } from '../../stores/savings'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

const financeStore = useFinanceStore()
const savingsStore = useSavingsStore()

function formatCurrency(value: number) {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
  return value < 0 ? `-${formatted}` : formatted
}

const grandTotalFormatted = computed(() => formatCurrency(savingsStore.grandTotal))

// Reverse so chart reads oldest → newest (left → right)
const chartMonths = computed(() => [...savingsStore.months].reverse())

const chartData = computed(() => ({
  labels: chartMonths.value.map(m => m.label),
  datasets: [
    {
      label: 'Savings',
      data: chartMonths.value.map(m => (m.hasData ? m.savings : null)),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.15)',
      pointBackgroundColor: chartMonths.value.map(m =>
        m.savings >= 0 ? '#22c55e' : '#ef4444'
      ),
      pointRadius: 4,
      tension: 0.3,
      fill: true,
      spanGaps: false
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          ctx.raw !== null ? formatCurrency(ctx.raw) : 'No data'
      }
    }
  },
  scales: {
    y: {
      ticks: {
        callback: (value: string | number) => formatCurrency(value as number)
      }
    }
  }
}

onMounted(async () => {
  await financeStore.ensureLoaded()
  await savingsStore.fetchAll()
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 pb-24">
    <MonthSelector />

    <!-- Header -->
    <div class="relative flex items-center justify-center pt-2 mb-2">
      <h2 class="text-3xl font-bold">Savings</h2>
    </div>

    <div class="px-4 pt-4 flex flex-col gap-4">

      <!-- Savings line chart -->
      <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <!-- Month line items -->
      <div class="rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden shadow">
        <div
          v-for="m in savingsStore.months"
          :key="m.key"
          class="flex justify-between items-center px-4 py-2.5"
        >
          <span class="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            {{ m.label }}
          </span>
          <UIcon v-if="m.loading" name="heroicons-solid:arrow-path" class="w-4 h-4 animate-spin text-gray-400" />
          <span v-else-if="!m.hasData" class="text-sm text-gray-400 dark:text-gray-500 italic">No data</span>
          <span
            v-else
            class="font-semibold"
            :class="m.savings >= 0 ? 'text-green-500' : 'text-yellow-500'"
          >
            {{ formatCurrency(m.savings) }}
          </span>
        </div>
      </div>

      <!-- Grand total -->
      <div class="rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center shadow">
        <span class="font-bold text-gray-800 dark:text-gray-100">Trailing savings:</span>
        <span
          class="text-2xl font-bold"
          :class="savingsStore.grandTotal >= 0 ? 'text-green-500' : 'text-yellow-500'"
        >
          {{ grandTotalFormatted }}
        </span>
      </div>

    </div>
  </div>
</template>

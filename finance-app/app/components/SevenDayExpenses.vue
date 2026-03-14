<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  expenses: { amount: number | null; date: string | null }[]
}>()

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const chartData = computed(() => {
  // Build array of the trailing 7 days (oldest → today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })

  // Sum expenses per day using UTC date string for comparison
  const totals = days.map(day => {
    const dayStr = day.toISOString().slice(0, 10) // "YYYY-MM-DD"
    return props.expenses
      .filter(e => e.date?.slice(0, 10) === dayStr)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0)
  })

  const labels = days.map(d => DAY_LABELS[d.getDay()])

  return {
    labels,
    datasets: [
      {
        label: 'Expenses',
        data: totals,
        backgroundColor: '#3B82F6',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ctx.parsed.y),
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9CA3AF' },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(156,163,175,0.15)' },
      ticks: {
        color: '#9CA3AF',
        callback: function (tickValue: string | number) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(typeof tickValue === 'number' ? tickValue : Number(tickValue));
        },
      },
    },
  },
}
</script>

<template>
  <UCard>
    <p class="text-sm font-semibold text-gray-500 mb-3">Last 7 Days</p>
    <div class="h-40">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </UCard>
</template>

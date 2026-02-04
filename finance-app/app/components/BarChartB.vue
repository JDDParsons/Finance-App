<script setup>
const props = defineProps({
  transactionData: {
    type: Object,
    required: true
  }
})


import {Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale} from 'chart.js'
import { Bar} from 'vue-chartjs'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function randomColor(alpha = 0.7) {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const rainbow13 = [
  '#FF3B30', // red
  '#FF6A00', // red-orange
  '#FF9500', // orange
  '#FFCC00', // yellow
  '#D4E157', // yellow-green
  '#4CAF50', // green
  '#00C853', // green-cyan
  '#00BCD4', // cyan
  '#2196F3', // blue
  '#3F51B5', // indigo
  '#673AB7', // violet
  '#9C27B0', // purple
  '#E91E63'  // magenta
]

const pastelRainbow13 = [
  '#F6A6A1', // soft red
  '#F7B199', // coral
  '#F9C784', // soft orange
  '#FBE7A1', // pastel yellow
  '#DDE8A9', // yellow-green
  '#B7E4C7', // mint green
  '#8ED1C6', // green-cyan
  '#9AD9EA', // soft cyan
  '#A7C7E7', // sky blue
  '#B4BCE6', // soft indigo
  '#C3B1E1', // lavender
  '#D6A4E7', // soft purple
  '#F3A0C5'  // soft pink
]



console.log('BarChart props:', props.transactionData);

const transactionData = props.transactionData
.filter(tx => {
  return !tx.category?.includes('Recurring payments') && !tx.category?.includes('Pay stubs') && !tx.category?.includes('Credit card payments') && !tx.category?.includes('E-transfers received') && !tx.category?.includes('Reimbursements') && !tx.category?.includes('Account transfer');
})

console.log('BarChart filtered:', transactionData);

const totalsByCategory = transactionData
.reduce(
  (acc, tx) => {
    if (!tx.category) return acc // skip null categories

    acc[tx.category] = (acc[tx.category] ?? 0) + Math.abs(tx.amount);
    return acc;
  },
  {}
)

const sortedTotals = computed(() =>
  Object.entries(totalsByCategory ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([category, total]) => ({
      category,
      total
    }))
);

const labels = sortedTotals.value.map(tx => tx.category);
const amounts = sortedTotals.value.map(tx => tx.total);

const data = {
  labels: labels,
  datasets: [
    {
      data: amounts,
      label: 'Recurring Payment Transactions',
      borderColor: rainbow13,
      backgroundColor: pastelRainbow13,
    }
  ]
}

// Chart options
const options = {
  responsive: true,
  datasets: {
    bar: {
      borderWidth: 2,
      indexAxis: 'y',
    },
  },
  plugins: {
    legend: {
      display: false
    },
  },
}

onMounted(async () => {
  await nextTick()
  window.dispatchEvent(new Event('resize'))
})
</script>

<template>
  <p class="text-xl font-semibold mb-4 text-center">Categorical Expenses</p>
  <div class="w-full h-[70vh]">
    <Bar :data="data" :options="options" />
  </div>
</template>
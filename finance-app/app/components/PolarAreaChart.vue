<script setup>

const props = defineProps({
    transactionData: {
    type: Object,
    required: true
  }
})

import { 
  Chart as ChartJS, 
  RadialLinearScale, 
  ArcElement, 
  Tooltip, 
  Legend 
} from 'chart.js'
import { PolarArea } from 'vue-chartjs'

const transactionData = props.transactionData
.filter(tx => {
  return !tx.category?.includes('Recurring payments') && !tx.category?.includes('Pay stubs') && !tx.category?.includes('Credit card payments') && !tx.category?.includes('E-transfers received') && !tx.category?.includes('Reimbursements') && !tx.category?.includes('Account transfer');
})

const totalIncome = props.transactionData
  .filter(tx => tx.category?.includes('Pay stubs'))
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const totalsByCategory = transactionData
.reduce(
  (acc, tx) => {
    if (!tx.category) return acc // skip null categories

    acc[tx.category] = (acc[tx.category] ?? 0) + Math.abs(tx.amount);
    return acc;
  },
  {}
)

const labels = Object.keys(totalsByCategory);
const amounts = Object.values(totalsByCategory).map(amount => Math.round((amount / totalIncome * 100)));

console.log(totalIncome);
console.log(amounts)

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

// 1. Register the components specifically needed for Polar Area charts
ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend)


// 2. Define your reactive data structure
const chartData = {
  labels: labels,
  datasets: [
    {
      label: 'My Dataset',
      data: amounts,
        backgroundColor: pastelRainbow13,
    }
  ]
}

// 3. Define chart configuration options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
      position: 'top',
    }
  }
}
</script>

<template>
<p class="text-xl font-semibold mb-4 text-center">Percent of Income Spent by Category</p>
  <div class="w-full h-[70vh]">
    <PolarArea :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  height: 40vh;
  width: 80vw;
}
</style>
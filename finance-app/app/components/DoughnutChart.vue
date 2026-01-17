<script setup>
const props = defineProps({
  transactionData: {
    type: Object,
    required: true
  }
})

import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale } from 'chart.js';
console.log('DoughnutChart props:', props.transactionData);
// Register necessary Chart.js components
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);
const totalPayStubs = props.transactionData
  .filter(tx => tx.category === 'Pay stubs') // keep only Pay stubs
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const totalTransfersReceivedFromRuthSebastian = props.transactionData
  .filter(tx => tx.category === 'E-transfers received' && tx.description.includes('RUTH A SEBASTIAN')) // keep only Transfers received from Ruth Sebastian
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const totalTransfersReceived = props.transactionData
  .filter(tx => tx.category === 'E-transfers received' && !tx.description.includes('RUTH A SEBASTIAN')) // keep remaining Transfers received
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const totalReimbursements = props.transactionData
  .filter(tx => tx.category === 'Reimbursements') // keep only Reimbursements
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const totalExpenses = props.transactionData
  .filter(tx => tx.category !== 'Pay stubs' && tx.category !== 'E-transfers received' && tx.category !== 'Reimbursements') // keep only expenses
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const netBalance = Math.round(totalPayStubs + totalExpenses);
const percentIncome = Math.round(((netBalance) / (totalPayStubs)) * 100);

const data = {
  labels: ['Income', 'Reimbursements', 'E-transfers received', 'E-transfers from Ruth Sebastian', 'Total Expenses'],
  datasets: [
    {
      backgroundColor: ['#007a38', '#48fa99', '#004da6', '#0091ff', '#ff614d'],
      data: [totalPayStubs, totalReimbursements, totalTransfersReceived, totalTransfersReceivedFromRuthSebastian, totalExpenses],
    },
  ],
};

const options = {
  responsive: true,
  maintainAspectRatio: false, // Allows you to control the size with CSS
  cutout: '70%', // Controls the size of the inner hollow space
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 25,
        font: {
          size: 16, // Increase font size for better readability  
        }
      },
    },
  },
};

onMounted(async () => {
  await nextTick()
  window.dispatchEvent(new Event('resize'))
})
</script>

<template>
  <p class="text-xl font-semibold mb-4 text-center">
    Income vs Expenses
  </p>

  <div class="relative w-full h-[70vh]">
    <!-- Doughnut chart -->
    <Doughnut :data="data" :options="options" />

    <!-- Center overlay -->
    <div
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -translate-y-6"
    >
      <p class="text-2xl font-bold">${{netBalance}}</p>
      <p class="text-sm text-gray-500 mb-2">Net balance</p>
      <p class="text-2xl font-bold">{{percentIncome}}%</p>
      <p class="text-sm text-gray-500">Income saved</p>
    </div>
  </div>
</template>
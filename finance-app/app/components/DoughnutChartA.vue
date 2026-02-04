<script setup>
const props = defineProps({
  transactionData: {
    type: Object,
    required: true
  }
})

import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale } from 'chart.js';
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);

const transactionData = props.transactionData.filter(tx => {
  return !tx.group.includes('SCOTIA') && 
  !tx.category?.includes('Account transfer') && 
  !tx.category?.includes('Credit card payments')
});

const totalPayStubs = transactionData
  .filter(tx => tx.category === 'Pay stubs') // keep only Pay stubs
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const totalTransfersReceivedFromRuthSebastian = transactionData
  .filter(tx => tx.category === 'E-transfers received' && tx.description.includes('RUTH A SEBASTIAN')) // keep only Transfers received from Ruth Sebastian
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const totalTransfersReceived = transactionData
  .filter(tx => tx.category === 'E-transfers received' && !tx.description.includes('RUTH A SEBASTIAN')) // keep remaining Transfers received
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const totalReimbursements = transactionData
  .filter(tx => tx.category === 'Reimbursements') // keep only Reimbursements
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const bankDeposits = transactionData
  .filter(tx => tx.category === 'Bank deposit') // keep only Bank deposits
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

console.log('Bank Deposits:', bankDeposits);

const totalExpenses = transactionData
  .filter(tx => tx.category !== 'Pay stubs' && tx.category !== 'E-transfers received' && tx.category !== 'Reimbursements' && tx.category !== 'Bank deposit') // keep only expenses
  .reduce((sum, tx) => sum + Number(tx.amount), 0); // sum their amounts

const netBalance = Math.round(totalPayStubs + totalReimbursements + totalExpenses);
const percentIncome = Math.round(((netBalance) / (totalPayStubs + totalReimbursements)) * 100);

const data = {
  labels: ['Income', 'Reimbursements', 'E-transfers from Ruth Sebastian', 'E-transfers from other sources', 'Bank deposits', 'Total Expenses'],
  datasets: [
    {
      backgroundColor: ['#B7E4C7','#8ED1C6', '#9AD9EA', '#A7C7E7', '#A7C7E7', '#F6A6A1'],
      data: [totalPayStubs, totalReimbursements, totalTransfersReceivedFromRuthSebastian, totalTransfersReceived, bankDeposits, totalExpenses],
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
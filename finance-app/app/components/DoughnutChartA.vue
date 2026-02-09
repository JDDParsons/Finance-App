<script setup>
import { computed, nextTick, onMounted } from 'vue'
const props = defineProps({
  transactionData: {
    type: Array,
    required: true
  }
})

import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale } from 'chart.js';
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);

const transactionDataFiltered = computed(() => (props.transactionData || []).filter(tx => {
  return !tx.group?.includes('SCOTIA') &&
    !tx.category?.includes('Account transfer') &&
    !tx.category?.includes('Credit card payments')
}))

const totalPayStubs = computed(() => transactionDataFiltered.value
  .filter(tx => tx.category === 'Pay stubs')
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const totalTransfersReceivedFromRuthSebastian = computed(() => transactionDataFiltered.value
  .filter(tx => tx.category === 'E-transfers received' && tx.description?.includes('RUTH A SEBASTIAN'))
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const totalTransfersReceived = computed(() => transactionDataFiltered.value
  .filter(tx => tx.category === 'E-transfers received' && !tx.description?.includes('RUTH A SEBASTIAN'))
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const totalReimbursements = computed(() => transactionDataFiltered.value
  .filter(tx => tx.category === 'Reimbursements')
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const bankDeposits = computed(() => transactionDataFiltered.value
  .filter(tx => tx.category === 'Bank deposit')
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const totalExpenses = computed(() => transactionDataFiltered.value
  .filter(tx => tx.category !== 'Pay stubs' && tx.category !== 'E-transfers received' && tx.category !== 'Reimbursements' && tx.category !== 'Bank deposit')
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const netBalance = computed(() => Math.round(totalPayStubs.value + totalReimbursements.value + totalExpenses.value))
const percentIncome = computed(() => {
  const denom = totalPayStubs.value + totalReimbursements.value
  return denom ? Math.round((netBalance.value / denom) * 100) : 0
})

const data = computed(() => ({
  labels: ['Income', 'Reimbursements', 'E-transfers from Ruth Sebastian', 'E-transfers from other sources', 'Bank deposits', 'Total Expenses'],
  datasets: [
    {
      backgroundColor: ['#B7E4C7','#8ED1C6', '#9AD9EA', '#A7C7E7', '#A7C7E7', '#F6A6A1'],
      data: [totalPayStubs.value, totalReimbursements.value, totalTransfersReceivedFromRuthSebastian.value, totalTransfersReceived.value, bankDeposits.value, totalExpenses.value],
    },
  ],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 25,
        font: { size: 16 }
      },
    },
  },
}

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
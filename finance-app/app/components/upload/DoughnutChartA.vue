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

const totalInflows = computed(() => transactionDataFiltered.value
  .filter(tx => Number(tx.amount) > 0)
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const totalOutflows = computed(() => transactionDataFiltered.value
  .filter(tx => Number(tx.amount) < 0)
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const totalPayStubs = computed(() => transactionDataFiltered.value
  .filter(tx => tx.category === 'Pay stubs')
  .reduce((sum, tx) => sum + Number(tx.amount), 0)
)

const totalInflowsLessPayStubs = computed(() => transactionDataFiltered.value
  .filter(tx => Number(tx.amount) > 0 && tx.category !== 'Pay stubs')
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

const totalIncome = computed(() => Math.round(totalPayStubs.value + totalInflowsLessPayStubs.value + totalOutflows.value))
const percentIncome = computed(() => {
  return totalIncome.value ? Math.round((totalIncome.value / (totalPayStubs.value + totalInflowsLessPayStubs.value)) * 100) : 0
})

const data = computed(() => ({
  labels: ['Regular Inflow', 'Other Inflow', 'Outflow'],
  datasets: [
    {
      backgroundColor: ['#B7E4C7','#8ED1C6', '#F6A6A1'],
      data: [totalPayStubs.value, totalInflowsLessPayStubs.value, totalOutflows.value],
    },
  ],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      display: false,
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 25,
        font: { size: 16 }
      },
    },
  },
  layout: {
    padding: {
      top: -20,
      bottom: -20,
      left: 0,
      right: 0
    }
  }
}

onMounted(async () => {
  await nextTick()
  window.dispatchEvent(new Event('resize'))
})
</script>

<template>
  <p class="text-xl font-semibold mb-4 text-center">
    Inflow vs Outflow
  </p>

  <div class="relative w-full h-[50vh]">
    <!-- Doughnut chart -->
    <Doughnut :data="data" :options="options" />

    <!-- Center overlay -->
    <div
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-6 pointer-events-none"
    >
      <p class="text-2xl font-bold">${{totalIncome}} ({{ percentIncome }}%)</p>
      <p class="text-sm text-gray-500 text-center">Income saved</p>
    </div>
  </div>
</template>
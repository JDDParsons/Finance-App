onMounted(async () => {
<script setup>
import { computed, nextTick, onMounted } from 'vue'
const props = defineProps({
  transactionData: {
    type: Array,
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
ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend)

const transactionDataFiltered = computed(() => (props.transactionData || []).filter(tx => {
  return !tx.group?.includes('SCOTIA') && tx.category?.includes('Recurring payments')
}))

const oxfam = computed(() => transactionDataFiltered.value.filter(tx => tx.description?.includes('OXFAM')).reduce((s, tx) => s + Math.abs(tx.amount), 0))
const compassion = computed(() => transactionDataFiltered.value.filter(tx => tx.description?.includes('COMPASSION')).reduce((s, tx) => s + Math.abs(tx.amount), 0))
const ourRescue = computed(() => transactionDataFiltered.value.filter(tx => tx.description?.includes('OUR RESCUE')).reduce((s, tx) => s + Math.abs(tx.amount), 0))
const koodo = computed(() => transactionDataFiltered.value.filter(tx => tx.description?.includes('KOODO')).reduce((s, tx) => s + Math.abs(tx.amount), 0))
const apple = computed(() => transactionDataFiltered.value.filter(tx => tx.description?.includes('APPLE')).reduce((s, tx) => s + Math.abs(tx.amount), 0))
const other = computed(() => transactionDataFiltered.value.filter(tx => !tx.description?.includes('OXFAM') && !tx.description?.includes('COMPASSION') && !tx.description?.includes('OUR RESCUE') && !tx.description?.includes('KOODO') && !tx.description?.includes('APPLE')).reduce((s, tx) => s + Math.abs(tx.amount), 0))

const data = computed(() => ({
  labels: ['Oxfam', 'Compassion', 'Our Rescue', 'Koodo', 'Apple App Store', 'Other'],
  datasets: [
    {
      backgroundColor: [
        'rgba(246, 166, 161, 0.5)',
        'rgba(247, 177, 153, 0.5)',
        'rgba(249, 199, 132, 0.5)',
        'rgba(251, 231, 161, 0.5)',
        'rgba(221, 232, 169, 0.5)',
        'rgba(183, 228, 199, 0.5)'
      ],
      data: [oxfam.value, compassion.value, ourRescue.value, koodo.value, apple.value, other.value],
    },
  ],
}))

const footer = (tooltipItems) => {
  const getDescriptionsForTooltip = (label) => {
    switch (label) {
      case 'Oxfam':
        return transactionDataFiltered.value.filter(tx => tx.description?.includes('OXFAM'));
      case 'Compassion':
        return transactionDataFiltered.value.filter(tx => tx.description?.includes('COMPASSION'));
      case 'Our Rescue':
        return transactionDataFiltered.value.filter(tx => tx.description?.includes('OUR RESCUE'));
      case 'Koodo':
        return transactionDataFiltered.value.filter(tx => tx.description?.includes('KOODO'));
      case 'Apple App Store':
        return transactionDataFiltered.value.filter(tx => tx.description?.includes('APPLE'));
      case 'Other': 
        return transactionDataFiltered.value.filter(tx => !tx.description?.includes('OXFAM') && !tx.description?.includes('COMPASSION') && !tx.description?.includes('OUR RESCUE') && !tx.description?.includes('KOODO') && !tx.description?.includes('APPLE'));
      default:
        return [];
    }
  };
  const label = tooltipItems[0].label;
  const descriptions = getDescriptionsForTooltip(label);
  const descriptionList = descriptions.map(tx => `- ${tx.description} ($${Math.abs(tx.amount)})`).join('\n');
  return descriptionList;
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      display: false,
      position: 'bottom',
      labels: { boxWidth: 12, padding: 25, font: { size: 16 } },
    },
    tooltip: { callbacks: { footer: footer } }
  },
};

onMounted(async () => {
  await nextTick()
  window.dispatchEvent(new Event('resize'))
})
</script>

<template>
  <p class="text-xl font-semibold mb-4 text-center">
    Donations and subscriptions
  </p>

  <div class="relative w-full h-[70vh]">
    <!-- Doughnut chart -->
    <PolarArea :data="data" :options="options" />

    <!-- Center overlay -->
     <!--
    <div
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -translate-y-12"
    >
      <p class="text-sm text-gray-500">Expense coverage</p>
      <p class="text-4xl font-bold">{{}}%</p>
    </div>
    -->
  </div>
</template>
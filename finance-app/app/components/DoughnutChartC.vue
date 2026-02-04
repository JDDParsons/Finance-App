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
ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend)

import { Doughnut } from 'vue-chartjs';
//import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale } from 'chart.js';
//ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);

const transactionData = props.transactionData
.filter(tx => {
  return !tx.group.includes('SCOTIA') && tx.category?.includes('Recurring payments');
});

const oxfam = transactionData
  .filter(tx => tx.description.includes('OXFAM'))
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const compassion = transactionData
  .filter(tx => tx.description.includes('COMPASSION'))
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const ourRescue = transactionData
  .filter(tx => tx.description.includes('OUR RESCUE'))
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const koodo = transactionData
  .filter(tx => tx.description.includes('KOODO'))
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const apple = transactionData
  .filter(tx => tx.description.includes('APPLE'))
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const other = transactionData
  .filter(tx => !tx.description.includes('OXFAM') && !tx.description.includes('COMPASSION') && !tx.description.includes('OUR RESCUE') && !tx.description.includes('KOODO') && !tx.description.includes('APPLE'))
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const data = {
  labels: ['Oxfam', 'Compassion', 'Our Rescue', 'Koodo', 'Apple App Store', 'Other'],
  datasets: [
    {
      backgroundColor: [
        'rgba(246, 166, 161, 0.5)', // #F6A6A1
        'rgba(247, 177, 153, 0.5)', // #F7B199
        'rgba(249, 199, 132, 0.5)', // #F9C784
        'rgba(251, 231, 161, 0.5)', // #FBE7A1
        'rgba(221, 232, 169, 0.5)', // #DDE8A9
        'rgba(183, 228, 199, 0.5)'  // #B7E4C7,
    ],
      data: [oxfam, compassion, ourRescue, koodo, apple, other],
    },
  ],
};

const footer = (tooltipItems) => {
  const getDescriptionsForTooltip = (label) => {
    switch (label) {
      case 'Oxfam':
        return transactionData.filter(tx => tx.description.includes('OXFAM'));
      case 'Compassion':
        return transactionData.filter(tx => tx.description.includes('COMPASSION'));
      case 'Our Rescue':
        return transactionData.filter(tx => tx.description.includes('OUR RESCUE'));
      case 'Koodo':
        return transactionData.filter(tx => tx.description.includes('KOODO'));
      case 'Apple App Store':
        return transactionData.filter(tx => tx.description.includes('APPLE'));
      case 'Other': 
        return transactionData.filter(tx => !tx.description.includes('OXFAM') && !tx.description.includes('COMPASSION') && !tx.description.includes('OUR RESCUE') && !tx.description.includes('KOODO') && !tx.description.includes('APPLE'));
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
    tooltip: {
        callbacks: {
            footer: footer,
        }
    }
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
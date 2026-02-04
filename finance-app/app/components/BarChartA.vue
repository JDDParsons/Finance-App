<script setup>
const props = defineProps({
  transactionData: {
    type: Object,
    required: true
  }
})

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

import {Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale} from 'chart.js'
import { Bar} from 'vue-chartjs'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)


const transactionData = props.transactionData
.filter(tx => {
  return tx.category?.includes('Recurring payments');
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
  labels: ['Donations', 'Subscriptions'],
  datasets: [
    {
      data: [oxfam],
      label: 'Oxfam',
      borderColor: '#9AD9EA',
      backgroundColor: '#9AD9EA',
      stack: 'Stack 0'
    },
    {
      data: [compassion],
      label: 'Compassion',
      borderColor: '#8ED1C6',
      backgroundColor: '#8ED1C6',
      stack: 'Stack 0'
    },
    {
      data: [ourRescue],
      label: 'Our Rescue',
      borderColor: '#B7E4C7',
      backgroundColor: '#B7E4C7',
      stack: 'Stack 0'
    },
    {
      data: [0, koodo],
      label: 'Koodo',
      borderColor: '#F6A6A1',
      backgroundColor: '#F6A6A1',
      stack: 'Stack 0'
    },
    {
      data: [0, apple],
      label: 'Apple App Store',
      borderColor: '#F7B199',
      backgroundColor: '#F7B199',
      stack: 'Stack 0'
    },
    {
      data: [0, other],
      label: 'Other',
      borderColor: '#F9C784',
      backgroundColor: '#F9C784',
      stack: 'Stack 0'
    },
  ]
}

const footer = (tooltipItems) => {
  console.log('Tooltip items:', tooltipItems);
  console.log('Transaction data:', transactionData);
  const label = tooltipItems[0].dataset.label;
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

  const descriptions = getDescriptionsForTooltip(label);

  // Get description property from each object in descriptions array 
  const descriptionList = descriptions.map(tx => `- ${tx.description} ($${Math.abs(tx.amount)})`).join('\n');
  return descriptionList;
};


// Chart options
const options = {
  responsive: true,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
        callbacks: {
            footer: footer,
        }
    }
  },
  scales: {
      x: { // Refers to the x-axis
          ticks: {
              font: { // Font properties are in a nested 'font' object
                  size: 18 // Set the desired font size in pixels
              }
          },
          grid: {
                  display: false // This removes horizontal grid lines
          }
      },
      y: {
          ticks: {
              font: {
                  size: 18 // You can also set the y-axis font size here
              }
          },
          grid: {
                  display: false // This removes horizontal grid lines
          }
      }
  },
}



onMounted(async () => {
  await nextTick()
  window.dispatchEvent(new Event('resize'))
})
</script>

<template>
  <p class="text-xl font-semibold mb-4 text-center">Recurring Payments</p>
  <div class="w-full h-[70vh]">
    <Bar :data="data" :options="options" />
  </div>
</template>
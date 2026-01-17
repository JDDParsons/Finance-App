<script setup>
const props = defineProps({
  series1: {
    type: Object,
    required: true
  },
  series2: {
    type: Object,
    required: false
  }
})


import {
  Chart as ChartJS,
  Title,
  Colors,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar} from 'vue-chartjs'

// Register Chart.js components (must be done once per app runtime)
ChartJS.register(
  Colors,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

// Chart options
const options = {
  responsive: true
}

onMounted(async () => {
  await nextTick()
  window.dispatchEvent(new Event('resize'))
})
</script>

<template>
  <div class="w-full h-[70vh]">
    <Bar :data="series1" :options="options" />
  </div>
  <div class="border h-[5vh] ml-6 pl-1"> Some other thing</div>
</template>
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
    !tx.category?.includes('Credit card payments') &&
    !tx.category?.includes('Pay stubs') &&
    !tx.category?.includes('E-transfers received') &&
    !tx.category?.includes('Reimbursements') &&
    !tx.category?.includes('Bank deposit')
}))

const rent = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Rent').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const groceries = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Groceries').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const retailAndOnlinePurchases = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Retail' || tx.category === 'Online purchases').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const restaurantsAndFoodDelivery = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Restaurants' || tx.category === 'Deliveries' || tx.category === 'Coffee').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const transportation = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Gas' || tx.category === 'Car insurance' || tx.category === 'Rideshares' || tx.category === 'Public transit' || tx.category === 'Train' || tx.category === 'Car rental').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const feesAndAppointments = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Account fees' || tx.category === 'Appointment fee').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const activities = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Activities').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const recurringPayments = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Recurring payments').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const investments = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Questrade').reduce((s, tx) => s + Math.abs(tx.amount), 0))
const other = computed(() => transactionDataFiltered.value.filter(tx => tx.category === 'Car purchase or maintenance' || tx.category === 'E-transfers sent').reduce((s, tx) => s + Math.abs(tx.amount), 0))

const totalExpenses = computed(() => Math.round(Math.abs(transactionDataFiltered.value.reduce((s, tx) => s + Number(tx.amount), 0))))
const sumOfCategories = computed(() => rent.value + groceries.value + retailAndOnlinePurchases.value + restaurantsAndFoodDelivery.value + transportation.value + feesAndAppointments.value + activities.value + recurringPayments.value + investments.value + other.value)
const percentOfExpenses = computed(() => totalExpenses.value ? Math.round((sumOfCategories.value / Math.abs(totalExpenses.value)) * 100) : 0)

const data = computed(() => ({
  labels: ['Rent', 'Groceries', 'Retail & Online Purchases', 'Restaurants & Food Delivery', 'Transportation', 'Fees & Appointments', 'Activities', 'Recurring Payments' , 'Investments', 'Other'],
  datasets: [
    {
      backgroundColor: [ '#F6A6A1', '#F7B199', '#F9C784', '#FBE7A1', '#DDE8A9', '#B7E4C7', '#8ED1C6', '#9AD9EA' , '#A7C7E7', '#B4BCE6'],
      data: [rent.value, groceries.value, retailAndOnlinePurchases.value, restaurantsAndFoodDelivery.value, transportation.value, feesAndAppointments.value, activities.value, recurringPayments.value, investments.value, other.value],
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
      labels: { boxWidth: 12, padding: 25, font: { size: 16 } },
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
    Expenses by Category
  </p>

  <div class="relative w-full h-[70vh]">
    <!-- Doughnut chart -->
    <Doughnut :data="data" :options="options" />

    <!-- Center overlay -->
    <div
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -translate-y-12"
    >
      <p class="text-2xl font-bold">{{percentOfExpenses}}%</p>
      <p class="text-sm text-gray-500 mb-2">Coverage</p>
      <p class="text-2xl font-bold">${{totalExpenses}}</p>
      <p class="text-sm text-gray-500">Total</p>
    </div>
  </div>
</template>
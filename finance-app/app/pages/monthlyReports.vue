<script setup>

import DoughnutChartA from '~/components/DoughnutChartA.vue';
import DoughnutChartB from '~/components/DoughnutChartB.vue';
import DoughnutChartC from '~/components/DoughnutChartC.vue';

import { attachCategoryLabel } from '../utils/attachCategoryLabel.ts';


const years = [2025, 2026];
const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const viewReport = ref(false);
const loading = ref(false);
const error = ref(null);
const rows = ref([]);
const categories = ref([]);
const monthData = ref(null);
const numberOfUncategorized = computed(() => {
  return monthData.value ? monthData.value.filter(tx => !tx.category).length : 0;
});

const now = new Date()

const selectedYear = ref(
  now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
)

const selectedMonth = ref(
  now.getMonth() === 0 ? 12 : now.getMonth()
)

const selectedMonthLabel = computed(() => {
  const monthObj = months.find(m => m.value === selectedMonth.value);
  return monthObj ? monthObj.label : '';
});

async function fetchAvailableMonthsAndYears() {
  // Placeholder function to fetch available months and years
  // In a real application, this would fetch from an API
  return;
}

async function fetchReportDetails(year, month) {
  // Placeholder function to fetch report details based on year and month
  console.log(`Fetching report for Year: ${year}, Month: ${month}`);
  loading.value = true;
    try {
    const [transRes, catRes] = await Promise.all([
      fetch(`/api/transactions?year=${year}&month=${month}`),
      fetch('/api/categories')
    ])

    if (!transRes?.ok) throw new Error(`Error fetching transactions`)
    if (!catRes?.ok) throw new Error(`Error fetching categories`)

    const transData = await transRes.json()
    const catData = await catRes.json()

    rows.value = transData || []
    categories.value = catData || []

    monthData.value = attachCategoryLabel(rows.value, categories.value);
    console.log(monthData.value);

    viewReport.value = true;
  } catch (err) {
    error.value = err.message || 'Failed to load data'
    console.error(error.value);
  } finally {
    loading.value = false
  }
}

const carouselUI = {
  item: 'basis-1/6',
  container: 'ms-0'
};

</script>
<template>
    <div class="min-h-screen flex flex-col">
        <UHeader title="Personal Finance App">
          <template #right>
            <UColorModeSwitch />
          </template>
        </UHeader>
        <UBanner v-if="numberOfUncategorized > 0" icon="i-lucide-info" color="neutral" to="/transactions" :title="`${numberOfUncategorized} uncategorized transactions in ${selectedMonthLabel} ${selectedYear}.`" />
        <UMain class="flex-1 flex items-center justify-center">
            <UContainer>
                <div v-if="!viewReport">
                    <div class="flex flex-col items-center justify-center gap-4 pb-20">
                        <h1 class="text-2xl font-semibold">Select Year and Month for Report</h1>
                        <div>
                            <USelect v-model="selectedYear" placeholder="Year" :items="years" class="w-50 m-2" />
                            <USelect v-model="selectedMonth" placeholder="Month" :items="months" class="w-50 m-2" />
                        </div>
                        <div>
                            <UButton to="/reports" color="neutral" variant="outline" size="xl" class="m-2">Back</UButton>
                            <UButton to="/monthlyReports" color="primary" variant="outline" active-color="primary" active-variant="outline" size="xl" class="m-2" @click="fetchReportDetails(selectedYear, selectedMonth)">Go</UButton>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <UButton to="/monthlyReports" color="neutral" variant="outline" size="xl" class="m-2" @click="viewReport = false">Choose a different month</UButton>
                    <div class="flex flex-col items-center justify-center gap-4 pb-10">
                      <h1 class="text-3xl font-bold">{{ selectedMonthLabel }} {{ selectedYear }}</h1>
                      <UCarousel
                        :items="[
                          { component: DoughnutChartA, props: {transactionData: monthData } },
                          { component: DoughnutChartB, props: { transactionData: monthData } },      
                          { component: DoughnutChartC, props: { transactionData: monthData } },
                        ]"
                        dots
                        loop
                        :ui="{
                          item: 'basis-full flex justify-center',
                        }"
                      >
                        <template #default="{ item }">
                          <!-- Centering wrapper -->
                          <div class="w-full flex justify-center">
                            <!-- Width-constrained container -->
                            <div class="w-full max-w-7xl">
                              <component :is="item.component" v-bind="item.props" />
                            </div>
                          </div>
                        </template>
                      </UCarousel>
                    </div>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>

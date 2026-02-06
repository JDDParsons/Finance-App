<script setup lang="ts">

import { h, ref, computed, watch, onMounted } from 'vue';
import type { TableColumn } from '@nuxt/ui'
import DoughnutChartA from '~/components/DoughnutChartA.vue';
import DoughnutChartB from '~/components/DoughnutChartB.vue';
import DoughnutChartC from '~/components/DoughnutChartC.vue';
import CategoryDropdown from '~/components/CategoryDropdown.vue';

import { getAllByMonth, getCategories, getStatementGroups } from '../../../composables/supabase.js';

// Utility function to attach category labels
function attachCategoryLabel(
  transData: any[],
  catData: any[]
) {
  const categoryMap = new Map<string, string>(
    catData.map((cat: any) => [cat.id, cat.label])
  )
  return transData.map(({ currentCategoryId, ...rest }) => ({
    ...rest,
    category: currentCategoryId
      ? categoryMap.get(currentCategoryId) ?? null
      : null
  }))
}

const years = ref<number[]>([]);
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
const viewData = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const rows = ref<any[]>([]);
const categories = ref<any[]>([]);
const monthData = ref<any>(null);
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const numberOfUncategorized = computed(() => {
  return monthData.value ? monthData.value.filter((tx: any) => !tx.category).length : 0;
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

function formatDateOnly(val: any) {
  if (!val) return '-'
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4}-\d{2}-\d{2})(?:T.*Z)?$/)
    if (m && m[1]) {
      const parts = m[1].split('-').map(Number)
      const [y, mm, dd] = parts as [number, number, number]
      const local = new Date(y, mm - 1, dd)
      if (!Number.isNaN(local.getTime())) {
        const formatted = local.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return formatted
      }
      return String(val)
    }
    return String(val)
  }
  return String(val)
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'transaction_date',
    header: 'Date',
    cell: ({ row }) => formatDateOnly(row.getValue('transaction_date'))
  },
  { accessorKey: 'description', header: 'Description' },
  {
    accessorKey: 'id',
    header: 'Category',
    cell: ({ row }) => {
      const transactionId = row.getValue('id') as string
      const currentCategoryId = row.original.currentCategoryId || null
      return h(CategoryDropdown, {
        transactionId,
        currentCategoryId,
        categories: categories.value
      })
    }
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const raw = row.getValue('amount')
      if (raw == null || raw === '') return '-'
      const n = Number(raw)
      if (Number.isNaN(n)) return String(raw)
      const formatted = currencyFormatter.format(n)
      const cls = n < 0 ? 'text-error' : 'text-success'
      return h('span', { class: `font-medium ${cls}` }, formatted)
    }
  }
]

const availableMonthsMap = ref<Record<number, number[]>>({})

const availableMonthItems = computed(() => {
  const available = availableMonthsMap.value[selectedYear.value] || []
  return months.filter(m => available.includes(m.value))
})

async function fetchAvailableMonthsAndYears() {
  try {
    const groups = await getStatementGroups()
    const map: Record<number, Set<number>> = {}

    groups.forEach((g: any) => {
      const y = g.year
      const mName = g.month
      if (!y || !mName) return
      // find month numeric value from months list
      const monthObj = months.find(mm => mm.label === mName)
      if (!monthObj) return
      if (!map[y]) map[y] = new Set<number>()
      map[y].add(monthObj.value)
    })

    const yearsArr = Object.keys(map).map(k => Number(k)).sort((a, b) => a - b)
    years.value = yearsArr

    const outMap: Record<number, number[]> = {}
    Object.entries(map).forEach(([ky, setV]) => {
      outMap[Number(ky)] = Array.from(setV).sort((a, b) => a - b)
    })
    availableMonthsMap.value = outMap

    // Ensure selectedYear is valid; if not, pick the latest available year
    if (!years.value.includes(selectedYear.value)) {
      if (years.value.length > 0) {
        selectedYear.value = years.value[years.value.length - 1]
      }
    }

    // Ensure selectedMonth is valid for the selectedYear; if not, pick the latest available month
    const availForYear = availableMonthsMap.value[selectedYear.value] || []
    if (availForYear.length > 0) {
      if (!availForYear.includes(selectedMonth.value)) {
        selectedMonth.value = Math.max(...availForYear)
      }
    }
  } catch (err) {
    console.error('Failed to fetch statement groups for available months/years', err)
  }
}

watch(selectedYear, (ny) => {
  const avail = availableMonthsMap.value[ny] || []
  if (avail.length === 0) return
  if (!avail.includes(selectedMonth.value)) {
    selectedMonth.value = Math.max(...avail)
  }
})

onMounted(() => {
  fetchAvailableMonthsAndYears()
})

async function fetchReportDetails(year: number, month: number) {
  // Placeholder function to fetch report details based on year and month
  console.log(`Fetching report for Year: ${year}, Month: ${month}`);
  loading.value = true;
    try {
      const [rowsRes, catData] = await Promise.all([
        getAllByMonth(year, month),
        getCategories()
      ])

      rows.value = rowsRes
      categories.value = catData || []

      monthData.value = attachCategoryLabel(rows.value, categories.value)
      console.log(monthData.value)

      viewReport.value = true
      viewData.value = false
    } catch (err: any) {
      error.value = err?.message || 'Failed to load data'
      console.error(error.value)
    } finally {
      loading.value = false
    }
}

</script>
<template>
    <div class="min-h-screen flex flex-col">
        <UHeader title="Personal Finance App">
          <template #right>
            <UColorModeSwitch />
          </template>
        </UHeader>
        <UBanner v-if="numberOfUncategorized > 0" icon="i-lucide-info" color="neutral" to="/transactions" :title="`${numberOfUncategorized} uncategorized transactions in ${selectedMonthLabel} ${selectedYear}.`" />
        <UMain class="flex-1 flex items-center justify-center pt-5">
            <UContainer>
              <transition name="fade" mode="out-in">
                <div v-if="!viewReport">
                    <div class="flex flex-col items-center justify-center gap-4 pb-20">
                        <h1 class="text-2xl font-semibold">Select Year and Month for Report</h1>
                        <div>
                            <USelect v-model="selectedYear" placeholder="Year" :items="years" class="w-50 m-2" />
                            <USelect v-model="selectedMonth" placeholder="Month" :items="availableMonthItems" class="w-50 m-2" />
                        </div>
                        <div>
                            <UButton to="/menu" color="neutral" variant="outline" size="xl" class="m-2">Back</UButton>
                            <UButton to="/reports/monthly" color="primary" active-color="primary" size="xl" class="m-2" @click="fetchReportDetails(selectedYear, selectedMonth)">See report</UButton>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <UButton to="/reports/monthly" color="neutral" variant="outline" size="xl" class="m-2" @click="viewReport = false">Choose a different month</UButton>
                    <UButton v-if="!viewData" color="info" variant="outline" size="xl" class="m-2" @click="viewData = true">View data</UButton>
                    <UButton v-if="viewData" color="info" variant="outline" size="xl" class="m-2" @click="viewData = false">View reports</UButton>
                    <div v-if="!viewData" class="flex flex-col items-center justify-center gap-4 pb-10">
                      <h1 class="text-3xl font-bold">{{ selectedMonthLabel }} {{ selectedYear }}</h1>
                      <UCarousel
                        :items="[
                          { component: DoughnutChartA, props: {transactionData: monthData || {} } },
                          { component: DoughnutChartB, props: { transactionData: monthData || {} } },      
                          { component: DoughnutChartC, props: { transactionData: monthData || {} } },
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
                    <div v-if="viewData" class="flex flex-col items-center justify-center gap-4 pb-10">
                      <h1 class="text-3xl font-bold text-center">{{ selectedMonthLabel }} {{ selectedYear }}</h1>
                      <UTable :data="rows" :columns="columns" class="w-full" />
                    </div>
                </div>
                </transition>
            </UContainer>
        </UMain>
    </div>
</template>

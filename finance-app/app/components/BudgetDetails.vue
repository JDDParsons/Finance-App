<script setup lang="ts">
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { useFinanceStore } from '../stores/finance'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const props = defineProps<{
    budgetAmount?: number
    budgetHits?: any[]
}>()

const financeStore = useFinanceStore()

function parseHitDate(value: string) {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1])
        const month = Number(dateOnlyMatch[2]) - 1
        const day = Number(dateOnlyMatch[3])
        return new Date(year, month, day)
    }

    return new Date(value)
}

const allocatedAmount = computed(() => Number(props.budgetAmount) || 0)

const currentMonthExpenseTotal = computed(() => {
    const hits = props.budgetHits || []
    const { year: selectedYear, month: selectedMonth } = financeStore.selectedMonth

    return hits.reduce((sum: number, hit: any) => {
        if (!hit?.date) return sum
        const hitDate = parseHitDate(hit.date)
        if (Number.isNaN(hitDate.getTime())) return sum

        const isSelectedMonth =
            hitDate.getFullYear() === selectedYear &&
            hitDate.getMonth() === selectedMonth - 1

        return isSelectedMonth ? sum + (Number(hit.amount) || 0) : sum
    }, 0)
})

const remainingAmount = computed(() => allocatedAmount.value - currentMonthExpenseTotal.value)

const percentRemaining = computed(() => {
    if (allocatedAmount.value <= 0) return 0
    return (remainingAmount.value / allocatedAmount.value) * 100
})

const remainingAmountForChart = computed(() => Math.max(remainingAmount.value, 0))

const pieData = computed(() => ({
    labels: ['Remaining', 'Spent'],
    datasets: [
        {
            backgroundColor: [chartColors.value.allocated, chartColors.value.spent],
            data: [remainingAmountForChart.value, currentMonthExpenseTotal.value]
        }
    ]
}))

const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
            position: 'bottom' as const
        }
    }
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatPercent(value: number) {
    return `${value.toFixed(1)}%`
}

const chartColors = ref({ allocated: '#6366f1', spent: '#87ffa1' })
onMounted(() => {
  const style = getComputedStyle(document.documentElement)
  const primary = style.getPropertyValue('--ui-primary').trim()
  const secondary = style.getPropertyValue('--ui-secondary').trim()
  if (primary) chartColors.value.allocated = primary
  if (secondary) chartColors.value.spent = secondary
})
</script>

<template>
    <div class="p-4 w-full h-120">
        <h3 class="text-2xl font-semibold text-gray-500 pb-1">Budget Details</h3>

        <div class="h-52 w-full mt-4 mb-4">
            <Pie :data="pieData" :options="pieOptions" />
        </div>

        <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-center">
            <div>
                <p class="text-xs text-gray-500">Allocated</p>
                <p class="font-semibold">{{ formatCurrency(allocatedAmount) }}</p>
            </div>
            <div>
                <p class="text-xs text-gray-500">Spent</p>
                <p class="font-semibold">{{ formatCurrency(currentMonthExpenseTotal) }}</p>
            </div>
        </div>
            <div class="mt-4 text-center">
                <p class="text-xs text-gray-500">Remaining</p>
                <div class="flex text-center justify-center items-center">
                    <p class="font-semibold">{{ formatCurrency(remainingAmount) }}</p>
                    <p class="font-semibold text-gray-500 ml-2">({{ formatPercent(percentRemaining) }})</p>
                </div>
            </div>
    </div>
</template>

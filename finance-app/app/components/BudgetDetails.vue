<script setup lang="ts">
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const props = defineProps<{
    budgetAmount?: number
    budgetHits?: any[]
}>()

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
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return hits.reduce((sum: number, hit: any) => {
        if (!hit?.date) return sum
        const hitDate = parseHitDate(hit.date)
        if (Number.isNaN(hitDate.getTime())) return sum

        const isCurrentMonth =
            hitDate.getFullYear() === currentYear &&
            hitDate.getMonth() === currentMonth

        return isCurrentMonth ? sum + (Number(hit.amount) || 0) : sum
    }, 0)
})

const remainingAmount = computed(() => allocatedAmount.value - currentMonthExpenseTotal.value)

const percentRemaining = computed(() => {
    if (allocatedAmount.value <= 0) return 0
    return (remainingAmount.value / allocatedAmount.value) * 100
})

const remainingAmountForChart = computed(() => Math.max(remainingAmount.value, 0))

const pieData = computed(() => ({
    labels: ['Spent', 'Remaining'],
    datasets: [
        {
            backgroundColor: ['#A7C7E7', '#B7E4C7'],
            data: [currentMonthExpenseTotal.value, remainingAmountForChart.value]
        }
    ]
}))

const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
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
</script>

<template>
    <div class="p-4 w-full h-100">
        <h3 class="text-2xl font-semibold text-gray-500 pb-1">Budget Details</h3>

        <div class="h-52 w-full mb-4">
            <Pie :data="pieData" :options="pieOptions" />
        </div>

        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
                <p class="text-xs text-gray-500">Allocated</p>
                <p class="font-semibold">{{ formatCurrency(allocatedAmount) }}</p>
            </div>
            <div>
                <p class="text-xs text-gray-500">Month Expenses</p>
                <p class="font-semibold">{{ formatCurrency(currentMonthExpenseTotal) }}</p>
            </div>
            <div>
                <p class="text-xs text-gray-500">Remaining</p>
                <p class="font-semibold">{{ formatCurrency(remainingAmount) }}</p>
            </div>
            <div>
                <p class="text-xs text-gray-500">Remaining %</p>
                <p class="font-semibold">{{ formatPercent(percentRemaining) }}</p>
            </div>
        </div>
    </div>
</template>

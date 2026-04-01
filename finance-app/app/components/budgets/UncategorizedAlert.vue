<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

const uncategorized = computed(() => {
    const { year, month } = store.selectedMonth
    return store.budgetHits.filter((h: any) => {
        if (h.budget_id !== null && h.budget_id !== undefined) return false
        const d = new Date((h.date as string).replace(/-/g, '/'))
        return d.getFullYear() === year && (d.getMonth() + 1) === month
    })
})

const total = computed(() =>
    uncategorized.value.reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0)
)

const count = computed(() => uncategorized.value.length)

function formatUSD(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
}
</script>

<template>
    <UAlert
        v-if="count > 0"
        color="warning"
        variant="soft"
        icon="heroicons-solid:exclamation-triangle"
        :title="`${count} uncategorized expense${count === 1 ? '' : 's'} — ${formatUSD(total)}`"
    />
</template>

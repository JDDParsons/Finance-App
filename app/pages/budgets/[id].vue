<script setup lang="ts">
import { useHitsApi } from '~/composables/api/useHitsApi'
import { useFinanceStore } from '~/stores/finance'

const route = useRoute()
const router = useRouter()
const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()
const { getBudgetHitsByBudget } = useHitsApi()

const budgetId = route.params.id as string

const budget = computed(() => store.budgets.find((b: any) => b.id === budgetId))
const progressBarColor = computed(() => {
    const amount = Number(budget.value?.currentPeriod?.amount) || 0
    const spent = Number(budget.value?.totalHitAmount) || 0
    const percentage = amount > 0 ? (spent / amount) * 100 : 0

    if (percentage > 200) return '#ef4444'
    if (percentage > 100) return '#eab308'
    return '#22c55e'
})

const budgetIconName = computed(() => {
    if (!budget.value) return 'heroicons:wallet-solid'
    return budget.value.icon ?? budgetIcon(budget.value.name)
})

const budgetIconStyle = computed(() => {
    const color = budget.value?.color || '#34d399'
    return {
        backgroundColor: `${color}1f`,
        color,
        borderColor: `${color}55`,
    }
})

useHead(computed(() => ({ title: budget.value ? `${budget.value.name} | R&J Finance` : 'Budget | R&J Finance' })))

const isEditModalOpen = ref(false)
const editRef = ref<any>(null)
const averageMonthlySpending = ref<number | null>(null)
const averageSpendingLoading = ref(false)

function formatDate(year: number, month: number, day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function trailingTwelveMonthRange(year: number, month: number) {
    const start = new Date(year, month - 12, 1)
    const end = new Date(year, month, 1)
    return {
        startDate: formatDate(start.getFullYear(), start.getMonth() + 1, start.getDate()),
        endDate: formatDate(end.getFullYear(), end.getMonth() + 1, end.getDate()),
    }
}

async function fetchAverageMonthlySpending() {
    averageSpendingLoading.value = true
    try {
        const { year, month } = store.selectedMonth
        const { startDate, endDate } = trailingTwelveMonthRange(year, month)
        const hits = await getBudgetHitsByBudget(budgetId, startDate, endDate)
        const monthlyTotals = new Map<string, number>()

        for (const hit of hits) {
            if (!hit?.date) continue
            const monthKey = String(hit.date).slice(0, 7)
            monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + (Number(hit.amount) || 0))
        }

        averageMonthlySpending.value = monthlyTotals.size
            ? [...monthlyTotals.values()].reduce((sum, total) => sum + total, 0) / monthlyTotals.size
            : null
    } catch {
        averageMonthlySpending.value = null
    } finally {
        averageSpendingLoading.value = false
    }
}

watch(
    () => [store.selectedMonth.year, store.selectedMonth.month],
    fetchAverageMonthlySpending,
    { immediate: true }
)

function formatCurrency(value: number | null | undefined) {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

function handleEditDone() {
    isEditModalOpen.value = false
    store.fetchAll()
}

async function handleExpenseUpdate() {
    await Promise.all([store.fetchAll(), fetchAverageMonthlySpending()])
}
</script>

<template>
    <UContainer class="py-6 pb-24 lg:pb-8">

        <!-- Back + Title row -->
        <div class="flex items-center gap-3 mb-6">
            <UButton
                icon="heroicons-solid:arrow-left"
                color="neutral"
                variant="ghost"
                @click="router.push('/budgets')"
                aria-label="Back to budgets"
            />
            <div
                v-if="budget"
                class="flex size-10 shrink-0 items-center justify-center rounded-full border"
                :style="budgetIconStyle"
            >
                <UIcon :name="budgetIconName" class="size-5" />
            </div>
            <h1 class="text-3xl font-bold flex-1">{{ budget?.name ?? 'Budget' }}</h1>
            <UButton
                icon="heroicons:pencil-square"
                color="neutral"
                variant="ghost"
                aria-label="Edit budget"
                @click="isEditModalOpen = true"
            />
        </div>

        <div v-if="!budget" class="text-center py-20 text-gray-400">
            Budget not found.
        </div>

        <template v-else>
            <!-- Top: Budget summary card -->
            <UCard class="mb-2 shadow overflow-hidden" :style="budget.color ? { backgroundColor: `${budget.color}22`, borderColor: `${budget.color}55`, borderTop: `3px solid ${budget.color}` } : {}">
                <div class="grid grid-cols-2 gap-4 text-center mb-4 sm:grid-cols-4">
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Allocated</p>
                        <p class="text-lg font-semibold">{{ formatCurrency(budget.currentPeriod?.amount) }}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Spent</p>
                        <p class="text-lg font-semibold">{{ formatCurrency(budget.totalHitAmount) }}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Remaining</p>
                        <p class="text-lg font-semibold" :style="{ color: progressBarColor }">
                            {{ formatCurrency(budget.totalRemainingAmount) }}
                        </p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Average spending per month</p>
                        <USkeleton v-if="averageSpendingLoading" class="mx-auto h-7 w-20" />
                        <p v-else class="text-lg font-semibold">
                            {{ averageMonthlySpending === null ? '—' : formatCurrency(averageMonthlySpending) }}
                        </p>
                    </div>
                </div>
                <BudgetsProgressBar
                    :value="budget.totalHitAmount"
                    :max="budget.currentPeriod?.amount"
                />
                <p class="text-xs text-right mt-1" :style="{ color: progressBarColor }">
                    {{ budget.progress?.toFixed(1) ?? '0.0' }}% used
                </p>
            </UCard>

            <!-- Form + List stacked -->
            <div class="flex flex-col gap-6">

                <!-- Expenses list -->
                <BudgetsExpensesList
                    :budget-id="budgetId"
                    :budget-hits="budget.hits"
                    @update="handleExpenseUpdate"
                    @cancel="() => {}"
                />

            </div>
        </template>

        <!-- Edit budget modal -->
        <UModal v-model:open="isEditModalOpen">
            <template #content>
                <UCard>
                    <template #header>
                        <div class="flex items-center justify-between">
                            <h2 class="text-2xl font-bold">Edit Budget</h2>
                            <UButton
                                icon="heroicons-solid:trash"
                                color="error"
                                variant="ghost"
                                size="sm"
                                aria-label="Delete budget"
                                @click="editRef?.handleDeleteBudget()"
                            />
                        </div>
                    </template>
                    <BudgetsEdit
                        ref="editRef"
                        :budget-id="budgetId"
                        :budget-name="budget?.name"
                        :budget-amount="budget?.currentPeriod?.amount"
                        :budget-color="budget?.color"
                        :budget-icon="budget?.icon ?? null"
                        @update="handleEditDone"
                        @cancel="isEditModalOpen = false"
                        @delete="router.push('/budgets')"
                    />
                </UCard>
            </template>
        </UModal>

    </UContainer>
</template>

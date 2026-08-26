<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const route = useRoute()
const router = useRouter()
const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const budgetId = route.params.id as string

const budget = computed(() => store.budgets.find((b: any) => b.id === budgetId))
const hasAverageMonthlySpending = computed(() =>
    budget.value?.averageMonthlySpending !== null && budget.value?.averageMonthlySpending !== undefined
)
const hasYtdBalance = computed(() =>
    budget.value?.ytdBalance !== null && budget.value?.ytdBalance !== undefined
)
const ytdBalanceColor = computed(() => {
    const balance = Number(budget.value?.ytdBalance) || 0
    if (balance > 0) return '#22c55e'
    if (balance < 0) return '#ef4444'
    return '#6b7280'
})
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

function handleExpenseUpdate() {
    store.fetchAll()
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
                <div class="grid grid-cols-3 gap-4 text-center mb-4">
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
                </div>
                <BudgetsProgressBar
                    :value="budget.totalHitAmount"
                    :max="budget.currentPeriod?.amount"
                />
                <p class="text-xs text-right mt-1" :style="{ color: progressBarColor }">
                    {{ budget.progress?.toFixed(1) ?? '0.0' }}% used
                </p>
                <div v-if="hasAverageMonthlySpending || hasYtdBalance" class="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div v-if="hasAverageMonthlySpending">
                        <div class="mb-1 flex items-center justify-center gap-1 whitespace-nowrap text-xs text-gray-500">
                            <span>Spending average</span>
                            <UTooltip text="Average monthly spending over the selected month and previous 11 months, excluding months with no expenses.">
                                <UButton
                                    icon="heroicons:information-circle"
                                    color="neutral"
                                    variant="link"
                                    size="xs"
                                    class="min-h-0 p-0 text-gray-400"
                                    aria-label="About spending average"
                                />
                            </UTooltip>
                        </div>
                        <p class="text-lg font-semibold">{{ formatCurrency(budget.averageMonthlySpending) }}</p>
                    </div>
                    <div v-if="hasYtdBalance" :class="{ 'col-start-2': !hasAverageMonthlySpending }">
                        <div class="mb-1 flex items-center justify-center gap-1 whitespace-nowrap text-xs text-gray-500">
                            <span>YTD balance</span>
                            <UTooltip text="Total budgeted minus total spent for this budget from January through the current month.">
                                <UButton
                                    icon="heroicons:information-circle"
                                    color="neutral"
                                    variant="link"
                                    size="xs"
                                    class="min-h-0 p-0 text-gray-400"
                                    aria-label="About YTD balance"
                                />
                            </UTooltip>
                        </div>
                        <p class="text-lg font-semibold" :style="{ color: ytdBalanceColor }">
                            {{ formatCurrency(budget.ytdBalance) }}
                        </p>
                    </div>
                </div>
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

<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { getBudgetErrorMessage } from '~/utils/budgetErrors'

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
const isDeletingBudget = ref(false)
const isWarningModalOpen = ref(false)
const warningMessage = ref('')
const spendingAverageTooltipOpen = ref(false)
const ytdBalanceTooltipOpen = ref(false)

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

async function handleDeleteBudget() {
    const confirmed = confirm('Delete this budget for the selected month? If the budget has no expenses in any month, the budget itself will also be deleted. This action cannot be undone.')
    if (!confirmed) return

    try {
        isDeletingBudget.value = true
        await store.removeBudget(budgetId)
        await router.push('/budgets')
    } catch (error: any) {
        warningMessage.value = getBudgetErrorMessage(error, 'Unable to delete this budget. Please try again.')
        isWarningModalOpen.value = true
        console.error('Unable to delete budget:', error)
    } finally {
        isDeletingBudget.value = false
    }
}
</script>

<template>
    <div class="min-h-screen">
        <AppHeader title="Budget Details" />

        <UContainer class="max-w-none py-6 pb-24 lg:pb-8">

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
            <UButton
                icon="heroicons-solid:trash"
                color="neutral"
                variant="ghost"
                aria-label="Delete budget"
                :loading="isDeletingBudget"
                :disabled="isDeletingBudget"
                @click="handleDeleteBudget"
            />
        </div>

        <div v-if="!budget" class="text-center py-20 text-gray-400">
            Budget not found.
        </div>

        <template v-else>
            <!-- Budget summary -->
            <section class="mb-6 border-b border-gray-200 pb-6 dark:border-gray-800">
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
                <div class="mx-auto w-[85%]">
                    <BudgetsProgressBar
                        :value="budget.totalHitAmount"
                        :max="budget.currentPeriod?.amount"
                    />
                    <p class="mt-1 text-center text-xs" :style="{ color: progressBarColor }">
                        {{ budget.progress?.toFixed(1) ?? '0.0' }}% used
                    </p>
                </div>
                <div v-if="hasAverageMonthlySpending || hasYtdBalance" class="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div v-if="hasAverageMonthlySpending">
                        <div class="mb-1 flex items-center justify-center gap-1 whitespace-nowrap text-xs text-gray-500">
                            <span>Spending average</span>
                            <UTooltip
                                v-model:open="spendingAverageTooltipOpen"
                                text="12-month average, including $0 months with a budget."
                                :delay-duration="0"
                                :content="{ side: 'right', collisionPadding: 12 }"
                                :arrow="{ width: 12, height: 6 }"
                                :ui="{
                                    content: 'h-auto max-w-40 py-1.5',
                                    text: 'whitespace-normal text-center',
                                    arrow: 'fill-default stroke-[var(--ui-border)]'
                                }"
                            >
                                <UButton
                                    icon="heroicons:information-circle"
                                    color="neutral"
                                    variant="link"
                                    size="xs"
                                    class="min-h-0 p-0 text-gray-400"
                                    aria-label="About spending average"
                                    @click.stop="spendingAverageTooltipOpen = !spendingAverageTooltipOpen"
                                />
                            </UTooltip>
                        </div>
                        <p class="text-lg font-semibold">{{ formatCurrency(budget.averageMonthlySpending) }}</p>
                    </div>
                    <div v-if="hasYtdBalance" :class="{ 'col-start-2': !hasAverageMonthlySpending }">
                        <div class="mb-1 flex items-center justify-center gap-1 whitespace-nowrap text-xs text-gray-500">
                            <span>YTD balance</span>
                            <UTooltip
                                v-model:open="ytdBalanceTooltipOpen"
                                text="Budgeted minus spent this year."
                                :delay-duration="0"
                                :content="{ side: 'left', collisionPadding: 12 }"
                                :arrow="{ width: 12, height: 6 }"
                                :ui="{
                                    content: 'h-auto max-w-40 py-1.5',
                                    text: 'whitespace-normal text-center',
                                    arrow: 'fill-default stroke-[var(--ui-border)]'
                                }"
                            >
                                <UButton
                                    icon="heroicons:information-circle"
                                    color="neutral"
                                    variant="link"
                                    size="xs"
                                    class="min-h-0 p-0 text-gray-400"
                                    aria-label="About YTD balance"
                                    @click.stop="ytdBalanceTooltipOpen = !ytdBalanceTooltipOpen"
                                />
                            </UTooltip>
                        </div>
                        <p class="text-lg font-semibold" :style="{ color: ytdBalanceColor }">
                            {{ formatCurrency(budget.ytdBalance) }}
                        </p>
                    </div>
                </div>
            </section>

            <!-- Form + List stacked -->
            <div class="flex flex-col gap-6">

                <!-- Expenses list -->
                <BudgetsExpensesList
                    :budget-id="budgetId"
                    :budget-hits="budget.hits"
                    :budget-color="budget.color"
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
                        <h2 class="text-2xl font-bold">Edit Budget</h2>
                    </template>
                    <BudgetsEdit
                        :budget-id="budgetId"
                        :budget-name="budget?.name"
                        :budget-amount="budget?.currentPeriod?.amount"
                        :budget-color="budget?.color"
                        :budget-icon="budget?.icon ?? null"
                        @update="handleEditDone"
                        @cancel="isEditModalOpen = false"
                    />
                </UCard>
            </template>
        </UModal>

        <WarningModal
            v-model:open="isWarningModalOpen"
            :message="warningMessage"
        />

        </UContainer>
    </div>
</template>

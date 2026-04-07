<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const route = useRoute()
const router = useRouter()
const store = useFinanceStore()

const budgetId = route.params.id as string

await store.ensureLoaded()

const budget = computed(() => store.budgets.find((b: any) => b.id === budgetId))

useHead(computed(() => ({ title: budget.value ? `${budget.value.name} | R&J Finance` : 'Budget | R&J Finance' })))

const isEditModalOpen = ref(false)

function progressBarColour(amount: number, totalHitAmount: number): string {
    const percentage = Math.min((totalHitAmount / amount) * 100, 100)
    const hue = Math.round(120 - (percentage * 1.2))
    return `hsl(${hue}, 80%, 45%)`
}

function barColour(budgetColor: string | null | undefined, amount: number, totalHitAmount: number): string {
    if (budgetColor) return budgetColor + 'cc'
    return progressBarColour(amount, totalHitAmount)
}

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

const refreshKey = ref(0)

function handleExpenseUpdate() {
    refreshKey.value++
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
                v-if="budget?.color"
                class="w-3 h-3 rounded-full shrink-0"
                :style="{ backgroundColor: budget.color }"
            />
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
            <UCard class="mb-6 shadow overflow-hidden" :style="budget.color ? { backgroundColor: `${budget.color}22`, borderColor: `${budget.color}55`, borderTop: `3px solid ${budget.color}` } : {}">
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
                        <p class="text-lg font-semibold">{{ formatCurrency(budget.totalRemainingAmount) }}</p>
                    </div>
                </div>
                <BudgetsProgressBar
                    :value="budget.totalHitAmount"
                    :max="budget.totalHitAmount > budget.currentPeriod?.amount ? budget.totalHitAmount : budget.currentPeriod?.amount"
                    :colour="barColour(budget.color, budget.currentPeriod?.amount, budget.totalHitAmount)"
                />
                <p class="text-xs text-gray-400 text-right mt-1">
                    {{ budget.progress?.toFixed(1) ?? '0.0' }}% used
                </p>
            </UCard>

            <!-- Form + List stacked -->
            <div class="flex flex-col gap-6">

                <!-- Create expense -->
                <BudgetsExpenseCreate
                    :key="refreshKey"
                    :budget-id="budgetId"
                    :budget-name="budget.name"
                    @update="handleExpenseUpdate"
                    @cancel="() => {}"
                />

                <USeparator />

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
                        <h2 class="text-2xl font-bold">Edit Budget</h2>
                    </template>
                    <BudgetsEdit
                        :budget-id="budgetId"
                        :budget-name="budget?.name"
                        :budget-amount="budget?.currentPeriod?.amount"
                        :budget-color="budget?.color"
                        @update="handleEditDone"
                        @cancel="isEditModalOpen = false"
                        @delete="router.push('/budgets')"
                    />
                    <template #footer>
                        <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">
                            Close
                        </UButton>
                    </template>
                </UCard>
            </template>
        </UModal>

    </UContainer>
</template>

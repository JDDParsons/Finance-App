<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()
const router = useRouter()
const searchText = ref('')
const displayBudgets = ref<any[]>([])
const loading = computed(() => store.loading)
const error = computed(() => store.error)

// Keep displayBudgets in sync with store; re-apply search filter and default sort (progress low to high)
watchEffect(() => {
    const q = searchText.value.toLowerCase().trim()
    const filtered = q
        ? store.budgets.filter((b: any) => b.name.toLowerCase().includes(q))
        : [...store.budgets]
    displayBudgets.value = filtered.sort((a: any, b: any) => (a.progress || 0) - (b.progress || 0))
})
const activeSortLabel = ref('Progress')
const ascendingIcon = 'heroicons-solid:arrow-long-up';
const descendingIcon = 'heroicons-solid:arrow-long-down';
const sortIcon = ref(ascendingIcon)

const sortDropdownItems = computed(() => [[
    { label: 'Name',     icon: activeSortLabel.value === 'Name'     ? sortIcon.value : undefined, onSelect: () => { activeSortLabel.value = 'Name';     sortBudgetsByName() } },
    { label: 'Spending', icon: activeSortLabel.value === 'Spending' ? sortIcon.value : undefined, onSelect: () => { activeSortLabel.value = 'Spending'; sortBudgetsByTotalHitAmount() } },
    { label: 'Amount',   icon: activeSortLabel.value === 'Amount'  ? sortIcon.value : undefined, onSelect: () => { activeSortLabel.value = 'Amount';   sortBudgetsByAmount() } },
    { label: 'Progress', icon: activeSortLabel.value === 'Progress' ? sortIcon.value : undefined, onSelect: () => { activeSortLabel.value = 'Progress'; sortBudgetsByProgress() } },
]])

const headerMenuItems = computed(() => [[
    { label: 'Add Budget', icon: 'heroicons-solid:plus', onSelect: () => { isSlideoverOpen.value = true } },
]])
const isSlideoverOpen = ref(false)
const budgetName = ref('')
const amount = ref('')
const budgetColor = ref('#6366f1')
const createLoading = ref(false)


function validateBudgetForm() {
    if (!budgetName.value.trim()) {
        alert('Please enter a budget name')
        return false
    }
    if (!amount.value) {
        alert('Please enter an amount')
        return false
    }
    return true
}

async function handleCreateBudget() {
    if (validateBudgetForm()) {
        try {
            createLoading.value = true
            await store.addBudget(budgetName.value, amount.value, budgetColor.value)
            budgetName.value = ''
            amount.value = ''
            isSlideoverOpen.value = false
        } catch (error: any) {
            alert('Error creating budget: ' + (error?.message || 'Unknown error'))
        } finally {
            createLoading.value = false
        }
    }
}

function closeSlideover() {
    isSlideoverOpen.value = false
    budgetName.value = ''
    amount.value = ''
    budgetColor.value = '#6366f1'
}

function goToBudget(budgetId: string) {
    router.push(`/budgets/${budgetId}`)
}


const spendingSortOrder = ref<'asc' | 'desc'>('asc')
function sortBudgetsByTotalHitAmount() {
    if (spendingSortOrder.value === 'asc') {
        displayBudgets.value.sort((a, b) => (a.totalHitAmount || 0) - (b.totalHitAmount || 0))
        spendingSortOrder.value = 'desc'
        sortIcon.value = descendingIcon
    } else {
        displayBudgets.value.sort((a, b) => (b.totalHitAmount || 0) - (a.totalHitAmount || 0))
        spendingSortOrder.value = 'asc' 
        sortIcon.value = ascendingIcon
    }
}

const nameSortOrder = ref<'asc' | 'desc'>('asc')
function sortBudgetsByName() {
    if (nameSortOrder.value === 'asc') {
        displayBudgets.value.sort((a, b) => a.name.localeCompare(b.name))
        nameSortOrder.value = 'desc'
        sortIcon.value = descendingIcon
    } else {
        displayBudgets.value.sort((a, b) => b.name.localeCompare(a.name))
        nameSortOrder.value = 'asc'
        sortIcon.value = ascendingIcon
    }
}


const amountSortOrder = ref<'asc' | 'desc'>('asc')
function sortBudgetsByAmount() {
        if (amountSortOrder.value === 'asc') {
            displayBudgets.value.sort((a, b) => (a.currentPeriod?.amount || 0) - (b.currentPeriod?.amount || 0))
            amountSortOrder.value = 'desc'
            sortIcon.value = descendingIcon
        } else {
            displayBudgets.value.sort((a, b) => (b.currentPeriod?.amount || 0) - (a.currentPeriod?.amount || 0))
            amountSortOrder.value = 'asc'
            sortIcon.value = ascendingIcon
        }
}

const progressSortOrder = ref<'asc' | 'desc'>('desc')
function sortBudgetsByProgress() {
    if (progressSortOrder.value === 'asc') {
        displayBudgets.value.sort((a, b) => (a.progress || 0) - (b.progress || 0))
        progressSortOrder.value = 'desc'
        sortIcon.value = descendingIcon
    } else {
        displayBudgets.value.sort((a, b) => (b.progress || 0) - (a.progress || 0))
        progressSortOrder.value = 'asc'
        sortIcon.value = ascendingIcon
    }
}

function progressBarColour(amount: number, totalHitAmount: number): string {
    const percentage = Math.min((totalHitAmount / amount) * 100, 100)
    const hue = Math.round(120 - (percentage * 1.2))
    return `hsl(${hue}, 80%, 45%)`
}

function progressBarStyle(amount: number, totalHitAmount: number) {
    const percentage = Math.min((totalHitAmount / amount) * 100, 100)
    const hue = Math.round(120 - (percentage * 1.2))
    return {
        color: `hsl(${hue}, 80%, 45%)`,
        backgroundColor: `hsla(${hue}, 80%, 45%, 0.15)`
    }
}

function formatCurrency(value: number | null) {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',  
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0  
    }).format(value)
}

const { budgetIcon } = useBudgetIcon()

function cardStyle(color: string | null | undefined) {
    if (!color) return {}
    return {
        backgroundColor: `${color}5`,
        borderColor: `${color}55`,
        borderTop: `3px solid ${color}`,
    }
}
</script>

<template>
    <UContainer>

        <!-- Month Selector -->
        <MonthSelector />

        <!-- Header -->
        <div class="relative flex items-center justify-center pt-2 mb-2">
            <h2 class="text-3xl font-bold">Budgets</h2>
            <div class="absolute right-0 flex items-center gap-1">
                <UDropdownMenu :items="sortDropdownItems" :content="{ align: 'end' }">
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="heroicons:bars-arrow-up-20-solid"
                        size="md"
                        :aria-label="`Sort by ${activeSortLabel}`"
                    />
                </UDropdownMenu>
                <UDropdownMenu :items="headerMenuItems" :content="{ align: 'end' }">
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="heroicons-solid:ellipsis-vertical"
                        size="md"
                        aria-label="More options"
                    />
                </UDropdownMenu>
            </div>
        </div>
        <!-- Uncategorized expenses alert -->
        <BudgetsUncategorizedAlert class="my-2" />
        
        <!-- Budget Allocation Chart -->
        <BudgetsAllocationChart class="mt-4 mb-2" />



        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <div v-if="loading" class="text-center py-12">
            <p class="text-gray-400">Loading budgets...</p>
        </div>

        <div v-else-if="displayBudgets.length === 0" class="text-center py-12">
            <p class="text-gray-400">No budgets yet. Use the menu to create one.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
            <UCard
                v-for="budget in displayBudgets"
                :key="budget.id"
                class="flex flex-col cursor-pointer shadow overflow-hidden"
                :style="cardStyle(budget.color)"
            >
            <div class="flex items-center w-full"> 
                <div class="flex-1" @click="goToBudget(budget.id)">
                    <div class="flex justify-between items-center gap-2 ">
                        <div class="flex items-center gap-2">
                            <UIcon :name="budgetIcon(budget.name)" class="w-5 h-5 shrink-0 text-muted" />
                            <h3 class="text-md font-semibold text-black dark:text-white">
                                {{ budget.name }}
                            </h3>
                        </div>
                        <UBadge size="lg" :style="progressBarStyle(budget?.currentPeriod?.amount, budget?.totalHitAmount)">
                            {{ formatCurrency(budget.totalRemainingAmount) }}
                        </UBadge>
                    </div>
                        
                    <div class="rounded-full ring-1 ring-black/20 dark:ring-white/20">
                        <BudgetsProgressBar
                            :value="budget.totalHitAmount"
                            :max="budget.totalHitAmount > budget?.currentPeriod?.amount ? budget.totalHitAmount : budget?.currentPeriod?.amount"
                            :colour="progressBarColour(budget?.currentPeriod?.amount, budget?.totalHitAmount)"
                        />
                    </div>
                </div>
            </div>

            </UCard>
        </div>

        <USlideover 
            v-model:open="isSlideoverOpen"
            class="w-full sm:max-w-md"
            >
            <template #content>
                <div class="flex flex-col h-full">
                    <div class="flex-1 p-6 overflow-y-auto">
                        <h3 class="text-2xl font-bold mb-6">Create a new budget</h3>
                        
                        <div class="space-y-6">
                            <UFormField label="Budget Name" required>
                                <UInput
                                    v-model="budgetName"
                                    placeholder="e.g., Monthly Groceries"
                                    type="text"
                                    size="xl"
                                />
                            </UFormField>

                            <UFormField label="Amount" required>
                                <UInput
                                    v-model="amount"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    size="xl"
                                />
                            </UFormField>

                            <UFormField label="Colour">
                                <BudgetsColorPicker v-model="budgetColor" />
                            </UFormField>
                        </div>
                    </div>
                    
                    <div class="p-6 border-t">
                        <div class="flex gap-3">
                            <UButton
                                color="primary"
                                @click="handleCreateBudget"
                                class="flex-1"
                                size="lg"
                                :loading="createLoading"
                                :disabled="createLoading"
                            >
                                Create this budget
                            </UButton>
                            <UButton
                                color="neutral"
                                variant="outline"
                                @click="closeSlideover"
                                class="flex-1"
                                size="lg"
                                :disabled="createLoading"
                            >
                                Close
                            </UButton>
                        </div>
                    </div>
                </div>
            </template>
        </USlideover>
    </UContainer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgets, getBudgetHitsByBudgetId, createBudget, signOut } from '../../composables/supabase'

const router = useRouter()
const originalBudgets = ref<any[]>([])
const budgets = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const isEditModalOpen = ref(false)
const editingBudgetId = ref<string | undefined>(undefined)
const editingBudgetName = ref<string | undefined>(undefined)
const editingBudgetAmount = ref<number | undefined>(undefined)
const activeEditTab = ref(0)
const sortItems = ref(['Name', 'Spending', 'Amount', 'Progress'])
const sortValue = ref('Name')
const ascendingIcon = 'heroicons-solid:arrow-long-up';
const descendingIcon = 'heroicons-solid:arrow-long-down';
const sortIcon = ref(ascendingIcon)
const searchText = ref('')
const isSlideoverOpen = ref(false)
const budgetName = ref('')
const amount = ref('')
const createLoading = ref(false)

onMounted(async () => {
    await fetchBudgets()
})

watch(searchText, (newValue) => {
    const searchLower = newValue.toLowerCase()
    budgets.value = originalBudgets.value.filter((budget) =>
        budget.name.toLowerCase().includes(searchLower)
    )
})


function handleNewBudget() {
    isSlideoverOpen.value = true
}

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
            await createBudget(budgetName.value, amount.value)
            budgetName.value = ''
            amount.value = ''
            isSlideoverOpen.value = false
            await fetchBudgets()
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
}

function openEditModal(budgetId: string) {
    editingBudgetId.value = budgetId
    editingBudgetName.value = budgets.value.find(b => b.id === budgetId)?.name || null
    editingBudgetAmount.value = budgets.value.find(b => b.id === budgetId)?.currentPeriod?.amount || null
    activeEditTab.value = 0
    isEditModalOpen.value = true
}

function openExpensesTab(budgetId: string) {
    editingBudgetId.value = budgetId
    editingBudgetName.value = budgets.value.find(b => b.id === budgetId)?.name || null
    activeEditTab.value = 1
    isEditModalOpen.value = true
}

function closeEditModal() {
    isEditModalOpen.value = false
    editingBudgetId.value = undefined
    editingBudgetName.value = undefined
    activeEditTab.value = 0
}

async function handleEditAction() {
    closeEditModal()
    await fetchBudgets()
}

function openCreateExpenseModal(budgetId: string) {
    editingBudgetId.value = budgetId
    editingBudgetName.value = budgets.value.find(b => b.id === budgetId)?.name
    editingBudgetAmount.value = budgets.value.find(b => b.id === budgetId)?.currentPeriod?.amount
    activeEditTab.value = 0
    isEditModalOpen.value = true
}

function closeCreateExpenseModal() {
    isEditModalOpen.value = false
    editingBudgetId.value = undefined
}

async function fetchBudgets() {
    try {
        loading.value = true
        error.value = null
        originalBudgets.value = await getBudgets()
        budgets.value = [...originalBudgets.value]

        budgets.value.forEach(async (budget) => {
            const { totalHitAmount, numberOfHits, hits } = await sumBudgetHits(budget.id)
            budget.hits = hits
            budget.totalHitAmount = totalHitAmount
            budget.numberOfHits = numberOfHits
            budget.progress = budget.currentPeriod?.amount ? (budget.totalHitAmount / budget.currentPeriod.amount) * 100 : 0
        })

        //sort by progress by default
        budgets.value.sort((a, b) => (b.progress || 0) - (a.progress || 0))

    } catch (err: any) {
        error.value = err?.message || 'Failed to load budgets'
        console.error('Error fetching budgets:', err)
    } finally {
        loading.value = false
    }
}

function handleSortChange() {
    switch (sortValue.value) {
        case 'Name':
            sortBudgetsByName()
            break
        case 'Spending':
            sortBudgetsByTotalHitAmount()
            break
        case 'Amount':
            sortBudgetsByAmount()
            break
        case 'Progress':
            sortBudgetsByProgress()
            break
    }
}

const spendingSortOrder = ref<'asc' | 'desc'>('asc')
function sortBudgetsByTotalHitAmount() {
    if (spendingSortOrder.value === 'asc') {
        budgets.value.sort((a, b) => (a.totalHitAmount || 0) - (b.totalHitAmount || 0))
        spendingSortOrder.value = 'desc'
        sortIcon.value = descendingIcon
    } else {
        budgets.value.sort((a, b) => (b.totalHitAmount || 0) - (a.totalHitAmount || 0))
        spendingSortOrder.value = 'asc' 
        sortIcon.value = ascendingIcon
    }
}

const nameSortOrder = ref<'asc' | 'desc'>('asc')
function sortBudgetsByName() {
    if (nameSortOrder.value === 'asc') {
        budgets.value.sort((a, b) => a.name.localeCompare(b.name))
        nameSortOrder.value = 'desc'
        sortIcon.value = descendingIcon
    } else {
        budgets.value.sort((a, b) => b.name.localeCompare(a.name))
        nameSortOrder.value = 'asc'
        sortIcon.value = ascendingIcon
    }
}


const amountSortOrder = ref<'asc' | 'desc'>('asc')
function sortBudgetsByAmount() {
        if (amountSortOrder.value === 'asc') {
            budgets.value.sort((a, b) => (a.currentPeriod?.amount || 0) - (b.currentPeriod?.amount || 0))
            amountSortOrder.value = 'desc'
            sortIcon.value = descendingIcon
        } else {
            budgets.value.sort((a, b) => (b.currentPeriod?.amount || 0) - (a.currentPeriod?.amount || 0))
            amountSortOrder.value = 'asc'
            sortIcon.value = ascendingIcon
        }
}

const progressSortOrder = ref<'asc' | 'desc'>('asc')
function sortBudgetsByProgress() {
    if (progressSortOrder.value === 'asc') {
        budgets.value.sort((a, b) => (a.progress || 0) - (b.progress || 0))
        progressSortOrder.value = 'desc'
        sortIcon.value = descendingIcon
    } else {
        budgets.value.sort((a, b) => (b.progress || 0) - (a.progress || 0))
        progressSortOrder.value = 'asc'
        sortIcon.value = ascendingIcon
    }
}

async function sumBudgetHits(budgetId: string) {
    try {
        const hits = await getBudgetHitsByBudgetId(budgetId);

        // Get current Year and Month (0-indexed, so January is 0)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const totalHitAmount = hits.reduce((sum, hit) => {
            // Parse hit.date (YYYY-MM-DD)
            const hitDate = new Date(hit.date.replace(/-/g, '\/'));
            const isCurrentMonth = 
                hitDate.getFullYear() === currentYear && 
                hitDate.getMonth() === currentMonth;

            return isCurrentMonth ? sum + (hit.amount || 0) : sum;
        }, 0);

        const numberOfHits = hits.length
        return { totalHitAmount, numberOfHits, hits }
        
    } catch (err) {
        console.error('Error summing budget hits:', err);
        return { totalHitAmount: 0, numberOfHits: 0, hits: [] };
    }
}

function progressBarColour(amount: number, totalHitAmount: number) {
    const percentage = (totalHitAmount / amount) * 100
    if (percentage < 60) return 'primary'
    if (percentage >= 60 && percentage < 90) return 'warning'
    if (percentage >= 90) return 'error'
    return 'error'
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
</script>

<template>
    <div>
        <UHeader title="Finance App">
          <template #right>
            <UColorModeSwitch />
            <UButton class="ml-2" color="neutral" variant="ghost" size="sm" @click="signOut()">Sign out</UButton>
          </template>
        </UHeader>
        <UMain>
            <UContainer>
                <div class="flex items-center justify-center pt-2 mb-2">
                    <h2 class="text-3xl font-bold">Monthly Budgets</h2>
                    <UButton 
                        color="primary" 
                        variant="ghost" 
                        size="lg" 
                        class="ml-2 mt-1"
                        @click="isSlideoverOpen = true"
                    >
                        <UIcon name="fa-solid:plus-circle" class="size-8" />
                    </UButton>
                </div>

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

                <div v-else-if="budgets.length === 0" class="text-center py-12">
                    <p class="text-gray-400">No budgets yet. Click the "New" button to create one.</p>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pb-24">
                    <UCard
                        v-for="budget in budgets"
                        :key="budget.id"
                        class="flex flex-col cursor-pointer"
                    >
                    <div class="flex items-center w-full"> 
                        <div class="flex-1" @click="openEditModal(budget.id)">
                            <div class="flex">
                                <h3 class="basis-1/2 text-left text-md font-semibold text-black dark:text-white">
                                    {{ budget.name }}
                                </h3>
                                <p class="basis-1/2 text-right text-sm pt-1 font-semibold">
                                    {{ formatCurrency(budget?.currentPeriod?.amount) }}
                                </p>
                            </div>
                            <UProgress class="mt-1" :color="progressBarColour(budget?.currentPeriod?.amount, budget?.totalHitAmount)" v-model="budget.totalHitAmount" :max="budget.totalHitAmount > budget?.currentPeriod?.amount ? budget.totalHitAmount : budget?.currentPeriod?.amount" />
                        </div>
                    </div>

                    </UCard>
                </div>

                <UModal v-model:open="isEditModalOpen">
                    <template #content>
                    <BudgetEditModal
                        v-if="editingBudgetId"
                        :budget-id="editingBudgetId"
                        :budget-name="editingBudgetName"
                        :budget-amount="editingBudgetAmount"
                        :budget-hits="budgets.find(b => b.id === editingBudgetId)?.hits || []"
                        :active-tab="activeEditTab"
                        @update="handleEditAction"
                        @cancel="closeEditModal"
                        @delete="handleEditAction"
                    />
                    </template>
                </UModal>

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
        </UMain>
    </div>
</template>

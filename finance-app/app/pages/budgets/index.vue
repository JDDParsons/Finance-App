<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgets, getBudgetHitsByBudgetId,signOut } from '../../composables/supabase'

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
    router.push('/budgets/create')
}

function openEditModal(budgetId: string) {
    editingBudgetId.value = budgetId
    editingBudgetName.value = budgets.value.find(b => b.id === budgetId)?.name || null
    editingBudgetAmount.value = budgets.value.find(b => b.id === budgetId)?.currentPeriod?.amount || null
    activeEditTab.value = 1
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
                <div class="flex flex-col pt-2 mb-8">
                    <h2 class="text-3xl font-bold">Monthly Budgets</h2>
                        <UButton color="primary" variant="solid" size="sm" class="mt-2 w-28" @click="handleNewBudget">
                            <UIcon name="subway:add-1" class="size-3" />
                            New budget
                        </UButton>
                        <div class="">
                            <UInputMenu 
                                size="xl" 
                                :icon="sortIcon" 
                                v-model="sortValue" 
                                @update:model-value="handleSortChange" 
                                :items="sortItems" 
                                class="w-40 mt-2"
                            />
                            <UInput
                                icon="heroicons-solid:magnifying-glass"
                                v-model="searchText"
                                placeholder="Search"
                                size="xl"
                                class="w-29 mt-2 ml-4"
                            />
                    </div>
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
            </UContainer>
        </UMain>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgets, getBudgetHitsByBudgetId,signOut } from '../../composables/supabase'
import Edit from '../../components/Edit.vue'
import Hits from '../../components/Hits.vue'

const router = useRouter()
const budgets = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const isEditModalOpen = ref(false)
const isHitsModalOpen = ref(false)
const editingBudgetId = ref<string | null>(null)

function handleNewBudget() {
    router.push('/budgets/create')
}

function openHitsModal(budgetId: string) {
    editingBudgetId.value = budgetId
    isHitsModalOpen.value = true
}

function closeHitsModal() {
    isHitsModalOpen.value = false
    editingBudgetId.value = null
}

function openEditModal(budgetId: string) {
    editingBudgetId.value = budgetId
    isEditModalOpen.value = true
}

function closeEditModal() {
    isEditModalOpen.value = false
    editingBudgetId.value = null
}

async function handleEditAction() {
    closeEditModal()
    await fetchBudgets()
}

function formatCurrency(value: number | null) {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

async function fetchBudgets() {
    try {
        loading.value = true
        error.value = null
        budgets.value = await getBudgets()

        budgets.value.forEach(async (budget) => {
            budget.totalHitAmount = await sumBudgetHits(budget.id)
            console.log(budget.name, budget.totalHitAmount)
        })
        console.log('Budgets with hit amounts:', budgets.value)
    } catch (err: any) {
        error.value = err?.message || 'Failed to load budgets'
        console.error('Error fetching budgets:', err)
    } finally {
        loading.value = false
    }
}

async function sumBudgetHits(budgetId: string) {
    try {
        const hits = await getBudgetHitsByBudgetId(budgetId);
        console.log('Hits for budget', budgetId, hits);

        // Get current Year and Month (0-indexed, so January is 0)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        return hits.reduce((sum, hit) => {
            // Parse hit.date (YYYY-MM-DD)
            const hitDate = new Date(hit.date);
            
            const isCurrentMonth = 
                hitDate.getFullYear() === currentYear && 
                hitDate.getMonth() === currentMonth;

            return isCurrentMonth ? sum + (hit.amount || 0) : sum;
        }, 0);
        
    } catch (err) {
        console.error('Error summing budget hits:', err);
        return 0;
    }
}

function progressBarColour(amount: number, totalHitAmount: number) {
    const percentage = (totalHitAmount / amount) * 100
    if (percentage < 60) return 'primary'
    if (percentage >= 60 && percentage < 90) return 'warning'
    if (percentage >= 90) return 'error'
    console.log(amount, totalHitAmount)
    console.log(percentage)
    return 'error'
}

onMounted(async () => {
    await fetchBudgets()
    console.log(budgets.value)
})
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
                <div class="flex flex-col mt-8 mb-8">
                    <h2 class="text-3xl font-bold">Monthly Budgets</h2>
                    <div class="">
                        <UButton color="primary" variant="outline" size="sm" class="mt-2" @click="handleNewBudget">
                            <UIcon name="subway:add-1" class="size-3" />
                            New budget
                        </UButton>
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

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <UCard
                        v-for="budget in budgets"
                        :key="budget.id"
                        class="flex flex-col"
                    >

                        <div class="space-y-3 flex">
                            <h3 class="text-lg font-semibold">{{ budget.name }}</h3>
                            <p class="text-lg font-semibold ml-auto">{{ formatCurrency(budget.currentPeriod.amount) }}</p>
                        </div>
                            <UProgress :color="progressBarColour(budget.currentPeriod.amount, budget.totalHitAmount)" v-model="budget.totalHitAmount" :max="budget.totalHitAmount > budget.currentPeriod.amount ? budget.totalHitAmount : budget.currentPeriod.amount" />
                            <div class="flex">
                            <p class="text-sm text-gray-500 mt-2">{{ formatCurrency(budget.totalHitAmount) }} spent</p>
                            <p class="text-sm text-gray-500 mt-2 ml-auto">{{ formatCurrency(budget.currentPeriod.amount - budget.totalHitAmount) }} remaining</p>
                            </div>
                        <template #footer>
                            <div class="flex justify-between"> 
                                <UButton color="warning" size="sm" variant="ghost" @click="openEditModal(budget.id)"><UIcon name="streamline-flex:cog-remix" class="ml-1" />Edit</UButton>  
                                <UButton color="info" size="sm" variant="ghost" @click="openHitsModal(budget.id)"><UIcon name="streamline-flex:cog-remix" class="ml-1" />Hits</UButton>  
                                <UButton class="ml-auto" color="primary" size="sm" variant="ghost" @click="$router.push(`/budgets/${budget.id}/hit`)"><UIcon name="streamline-flex:arrow-cursor-click-2-solid" class="ml-1" />Hit</UButton>  
                            </div>
                        </template>
                    </UCard>
                </div>

                <UModal v-model:open="isHitsModalOpen">
                    <template #content>
                    <Hits
                        :budget-id="editingBudgetId"
                        @cancel="closeHitsModal"
                    />
                    </template>
                </UModal>

                <UModal v-model:open="isEditModalOpen">
                    <template #content>
                    <Edit
                        :budget-id="editingBudgetId"
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

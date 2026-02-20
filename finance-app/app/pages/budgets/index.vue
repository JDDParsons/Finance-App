<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgets, signOut } from '../../composables/supabase'

const router = useRouter()
const budgets = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function handleNewBudget() {
    router.push('/budgets/create')
}

function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
        return dateString
    }
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
    } catch (err: any) {
        error.value = err?.message || 'Failed to load budgets'
        console.error('Error fetching budgets:', err)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchBudgets()
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
                <div class="flex justify-between items-center mt-8 mb-8">
                    <h1 class="text-3xl font-bold">My Budgets</h1>
                    <UButton color="primary" @click="handleNewBudget">New</UButton>
                </div>

                <div v-if="error" class="mb-4">
                    <UAlert
                        title="Error"
                        :description="error"
                        color="red"
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
                        <template #header>
                            <h3 class="text-lg font-semibold">{{ budget.name }}</h3>
                        </template>
                        
                        <div class="space-y-3 flex-1">
                            <div>
                                <p class="text-sm text-gray-500">Period</p>
                                <p class="text-sm">{{ formatDate(budget.start_date) }} - {{ formatDate(budget.end_date) }}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Budget Amount</p>
                                <p class="text-lg font-semibold">{{ formatCurrency(budget.amount) }}</p>
                            </div>
                        </div>
                    </UCard>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getBudgetById, updateBudget, deleteBudget, signOut } from '../composables/supabase'

const props = defineProps<{
    budgetId: string
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const router = useRouter()
const route = useRoute()
const budgetId = route.params.id as string

const budgetName = ref('')
const startDate = ref('')
const endDate = ref('')
const amount = ref('')
const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

function validateForm() {
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

async function fetchBudget() {
    try {
        loading.value = true
        error.value = null
        const budget = await getBudgetById(props.budgetId)
        budgetName.value = budget.name
        amount.value = budget.currentPeriod.amount
        console.log('Fetched budget:', budget)
    } catch (err: any) {
        error.value = err?.message || 'Failed to load budget'
        console.error('Error fetching budget:', err)
    } finally {
        loading.value = false
    }
}

async function handleUpdateBudget() {
    if (validateForm()) {
        try {
            loading.value = true
            error.value = null
            await updateBudget(props.budgetId, budgetName.value, amount.value)
            emit('update')
        } catch (err: any) {
            error.value = err?.message || 'Error updating budget'
            console.error('Error updating budget:', err)
        } finally {
            loading.value = false
        }
    }
}

async function handleDeleteBudget() {
    if (confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
        try {
            deleting.value = true
            error.value = null
            await deleteBudget(props.budgetId)
            emit('delete')
        } catch (err: any) {
            error.value = err?.message || 'Error deleting budget'
            console.error('Error deleting budget:', err)
            deleting.value = false
        }
    }
}

function handleCancel() {
    emit('cancel')
}

onMounted(() => {
    fetchBudget()
})
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="text-2xl font-bold">Edit Budget</h2>
        </template>
        
        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="red"
                variant="soft"
            />
        </div>

        <div v-if="loading" class="text-center py-12">
            <p class="text-gray-400">Loading budget...</p>
        </div>

        <div v-else class="space-y-6">
            <UFormField label="Budget Name" required>
                <UInput
                    v-model="budgetName"
                    placeholder="e.g., Monthly Groceries"
                    type="text"
                />
            </UFormField>

            <UFormField label="Amount" required>
                <UInput
                    v-model="amount"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                />
            </UFormField>
            <UButton
                color="primary"
                @click="handleUpdateBudget"
                class="flex-1"
                :loading="loading"
                :disabled="loading || deleting"
            >
                Update Budget
            </UButton>
        </div>

        <template #footer>
            <div class="flex gap-4">
                <UButton
                    color="neutral"
                    variant="ghost"
                    @click="handleCancel"
                    class="w-25"
                    :disabled="loading || deleting"
                >
                    Cancel
                </UButton>
                <UButton
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="handleDeleteBudget"
                    class="w-25 ml-auto"
                    :loading="deleting"
                    :disabled="loading || deleting"
                >
                    Delete Budget
                </UButton>
            </div>
        </template>
    </UCard>
</template>

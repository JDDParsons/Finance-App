<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getBudgetById, updateBudget, deleteBudget, signOut } from '~/composables/supabase'

const props = defineProps<{
    budgetId: string
    budgetName?: string
    budgetAmount?: number
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const router = useRouter()
const route = useRoute()
const budgetId = route.params.id as string

const name = ref(props.budgetName ?? '')
const amount = ref(props.budgetAmount ?? 0)

const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

function validateForm() {
    if (!name.value.trim()) {
        alert('Please enter a budget name')
        return false
    }
    if (!amount.value) {
        alert('Please enter an amount')
        return false
    }
    return true
}

async function handleUpdateBudget() {
    if (validateForm()) {
        try {
            loading.value = true
            error.value = null
            await updateBudget(props.budgetId || '', name.value, amount.value.toString())
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
            const isFkViolation = err?.code === '23503' || err?.message?.includes('Budget_Hit')
            error.value = isFkViolation
                ? 'This budget has expense records associated with it and cannot be deleted. Remove all expenses from this budget first, then try again.'
                : err?.message || 'Error deleting budget'
            console.error('Error deleting budget:', err)
            deleting.value = false
        }
    }
}

</script>

<template>
        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <div v-if="loading" class="text-center py-12">
            <p class="text-gray-400">Loading budget...</p>
        </div>

        <div v-else class="space-y-6">
            <UFormField label="Budget Name" required>
                <UInput
                    v-model="name"
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
            <UButton
                color="secondary"
                @click="handleUpdateBudget"
                class="flex-1"
                :loading="loading"
                :disabled="loading || deleting"
            >
                Update Budget
            </UButton>
        </div>
        <UButton
            color="error"
            variant="outline"
            size="sm"
            @click="handleDeleteBudget"
            class="w-25 mt-5 mb-5"
            :loading="deleting"
            :disabled="loading || deleting"
        >
            Delete Budget
        </UButton>
</template>

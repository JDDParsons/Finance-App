<script setup lang="ts">
import { createBudgetHit } from '../composables/supabase'

const props = defineProps<{
    budgetId?: string,
    budgetName?: string,
    budgets?: any[]
}>()

const selectedBudgetId = ref(props.budgetId ?? '')
const noBudget = ref(false)

const emit = defineEmits<{
    update: [],
    cancel: []
}>()

function handleCancel() {
    emit('cancel')
}

const localDate = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD
const date = ref(localDate);
const amount = ref('')
const note = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

function validateForm() {
    if (!date.value) {
        alert('Please select a date')
        return false
    }
    if (!amount.value) {
        alert('Please enter an amount')
        return false
    }
    return true
}

async function handleCreateHit() {
    if (!noBudget.value && !props.budgetId && !selectedBudgetId.value) {
        alert('Please select a budget')
        return
    }
    if (validateForm()) {
        try {
            loading.value = true
            error.value = null
            const budgetIdToSubmit = noBudget.value ? null : (selectedBudgetId.value || props.budgetId || null)
            await createBudgetHit(budgetIdToSubmit, date.value, amount.value, note.value)
            emit('update') // Notify parent to refresh the budget hits list
            emit('cancel') // Close the modal after successful creation
        } catch (err: any) {
            error.value = err?.message || 'Error recording budget hit'
            console.error('Error creating budget hit:', err)
            alert(error.value)
        } finally {
            loading.value = false
        }
    }
}
</script>

<template>        
    <div class="w-full h-100 ml-3">

        <h3 class="text-2xl font-semibold text-gray-500 pb-4 pt-4">Add Expense</h3>

        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <div class="space-y-6">
            <UFormField label="Amount" required>
                <UInput
                    v-model="amount"
                    highlight
                    color="info"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    size="xl"
                />
            </UFormField>
            
            <UFormField label="Date" required>
                <UInput
                    v-model="date"
                    highlight
                    color="info"
                    type="date"
                    size="xl"
                />
            </UFormField>
            
            <UFormField label="Note">
                <UInput
                    v-model="note"
                    highlight
                    color="info"
                    placeholder="Leave a note..."
                    type="text"
                    size="xl"
                />
            </UFormField>

            <template v-if="!props.budgetId && props.budgets?.length">
                <UFormField label="Budget" :required="!noBudget">
                    <USelect
                        v-model="selectedBudgetId"
                        :items="props.budgets.map((b: any) => ({ label: b.name, value: b.id }))"
                        placeholder="Select a budget..."
                        size="xl"
                        color="info"
                        highlight
                        :disabled="noBudget"
                    />
                </UFormField>
                <UCheckbox v-model="noBudget" color="info" label="No budget" />
            </template>

            <UButton
                color="info"
                variant="solid"
                @click="handleCreateHit"
                class="flex-1 mt-2"
                :disabled="loading"
                :loading="loading"
            >
                Submit expense
            </UButton>
        </div>
    </div>
</template>

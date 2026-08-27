<script setup lang="ts">
import { ref } from 'vue'
import {
    getBudgetErrorMessage,
    isBudgetPeriodHasExpensesError,
    isDuplicateBudgetNameError,
    isInvalidBudgetAmountError,
} from '~/utils/budgetErrors'

const props = defineProps<{
    budgetId: string
    budgetName?: string
    budgetAmount?: number
    budgetColor?: string
    budgetIcon?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const store = useFinanceStore()

const name = ref(props.budgetName ?? '')
const amount = ref(props.budgetAmount ?? 0)
const color = ref(props.budgetColor ?? '#6366f1')
const icon = ref<string | null>(props.budgetIcon ?? null)

const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)
const nameError = ref<string | null>(null)
const amountError = ref<string | null>(null)

watch(name, () => {
    nameError.value = null
})

watch(amount, () => {
    amountError.value = null
})

function validateForm() {
    if (!name.value.trim()) {
        alert('Please enter a budget name')
        return false
    }
    return true
}

async function handleUpdateBudget() {
    if (validateForm()) {
        try {
            loading.value = true
            error.value = null
            nameError.value = null
            amountError.value = null
            await store.editBudget(props.budgetId || '', name.value, amount.value.toString(), color.value, icon.value ?? undefined, store.selectedMonth.year, store.selectedMonth.month)
            emit('update')
        } catch (err: any) {
            if (isDuplicateBudgetNameError(err)) {
                nameError.value = 'A budget with this name already exists.'
            } else if (isInvalidBudgetAmountError(err)) {
                amountError.value = 'Amount must be greater than 0.'
            } else {
                error.value = getBudgetErrorMessage(err, 'Error updating budget')
            }
            console.error('Error updating budget:', err)
        } finally {
            loading.value = false
        }
    }
}

async function handleDeleteBudget() {
    if (confirm('Delete this budget for the selected month? If the budget has no expenses in any month, the budget itself will also be deleted. This action cannot be undone.')) {
        try {
            deleting.value = true
            error.value = null
            await store.removeBudget(props.budgetId)
            emit('delete')
        } catch (err: any) {
            error.value = isBudgetPeriodHasExpensesError(err)
                ? 'This budget has expense records in the selected month and cannot be deleted for that month. Remove those expenses first, then try again.'
                : getBudgetErrorMessage(err, 'Error deleting budget')
            console.error('Error deleting budget:', err)
            deleting.value = false
        }
    }
}

defineExpose({ handleDeleteBudget })
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
            <UFormField label="Budget Name" :error="nameError" required>
                <UInput
                    v-model="name"
                    placeholder="e.g., Monthly Groceries"
                    type="text"
                    size="xl"
                />
            </UFormField>

            <UFormField label="Amount" :error="amountError" required>
                <UInput
                    v-model="amount"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    size="xl"
                />
            </UFormField>

            <UFormField label="Colour">
                <BudgetsColorPicker v-model="color" />
            </UFormField>

            <UFormField label="Icon">
                <BudgetsChooseIcon v-model="icon" :color="color" />
            </UFormField>

            <div class="flex gap-3">
                <UButton
                    color="secondary"
                    @click="handleUpdateBudget"
                    class="flex-1"
                    :loading="loading"
                    :disabled="loading || deleting"
                >
                    Update Budget
                </UButton>
                <UButton
                    color="neutral"
                    variant="outline"
                    @click="emit('cancel')"
                    class="flex-1"
                    :disabled="loading || deleting"
                >
                    Cancel
                </UButton>
            </div>
        </div>
</template>

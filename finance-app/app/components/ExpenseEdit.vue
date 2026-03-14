<script setup lang="ts">
import { useFinanceStore } from '../stores/finance'

const props = defineProps<{
    expenseId: string
    expenseAmount?: number
    expenseDate?: string
    expenseNote?: string | null
    expenseBudgetId?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const store = useFinanceStore()

const amount = ref(props.expenseAmount ?? 0)
const date = ref(props.expenseDate ? props.expenseDate.slice(0, 10) : new Date().toLocaleDateString('en-CA'))
const note = ref(props.expenseNote ?? '')
const noBudget = ref(!props.expenseBudgetId)
const selectedBudgetId = ref(props.expenseBudgetId ?? '')

const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

const budgetOptions = computed(() =>
    store.budgets.map((b: any) => ({ label: b.name, value: b.id }))
)

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

async function handleUpdate() {
    if (!validateForm()) return
    try {
        loading.value = true
        error.value = null
        const budgetIdToSubmit = noBudget.value ? null : (selectedBudgetId.value || null)
        await store.updateExpense(props.expenseId, budgetIdToSubmit, date.value, amount.value.toString(), note.value)
        emit('update')
    } catch (err: any) {
        error.value = err?.message || 'Error updating expense'
        console.error('Error updating expense:', err)
    } finally {
        loading.value = false
    }
}

async function handleDelete() {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return
    try {
        deleting.value = true
        error.value = null
        await store.removeExpense(props.expenseId)
        emit('delete')
    } catch (err: any) {
        error.value = err?.message || 'Error deleting expense'
        console.error('Error deleting expense:', err)
        deleting.value = false
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

        <UFormField label="Budget">
            <USelect
                v-model="selectedBudgetId"
                :items="budgetOptions"
                placeholder="No budget"
                size="xl"
                color="info"
                highlight
                :disabled="noBudget"
            />
        </UFormField>

        <UCheckbox v-model="noBudget" color="info" label="No budget" />

        <UButton
            color="secondary"
            @click="handleUpdate"
            class="flex-1"
            :loading="loading"
            :disabled="loading || deleting"
        >
            Update Expense
        </UButton>
    </div>

    <UButton
        color="error"
        variant="outline"
        size="sm"
        @click="handleDelete"
        class="w-25 mt-5 mb-5"
        :loading="deleting"
        :disabled="loading || deleting"
    >
        Delete Expense
    </UButton>
</template>

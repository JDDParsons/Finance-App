<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const props = defineProps<{
    expenseId: string
    expenseAmount?: number
    expenseDate?: string
    expenseNote?: string | null
    expenseBudgetId?: string | null
    expenseAccountId?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const amount = ref(props.expenseAmount ?? 0)
const date = ref(props.expenseDate ? props.expenseDate.slice(0, 10) : new Date().toLocaleDateString('en-CA'))
const note = ref(props.expenseNote ?? '')
const noBudget = ref(!props.expenseBudgetId)
const selectedBudgetId = ref(props.expenseBudgetId ?? '')
const choosingBudget = ref(false)

const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

const chosenBudget = computed(() => {
    if (noBudget.value) return null
    return store.budgets.find((b: any) => b.id === selectedBudgetId.value) ?? null
})

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
    selectedBudgetId.value = selection.budgetId ?? ''
    noBudget.value = selection.noBudget
    choosingBudget.value = false
}

const immutableAccountId = computed<string | null>(() => {
    if (props.expenseAccountId !== undefined) return props.expenseAccountId
    const hit = store.budgetHits.find((h: any) => h.id === props.expenseId)
    return hit?.account_id ?? null
})

const selectedAccountId = ref<string>(immutableAccountId.value ?? '__none__')

const accountOptions = computed(() => [
    { label: 'No account', value: '__none__' },
    ...store.accounts.map((a: any) => ({
        label: a.name || a.institution || 'Account',
        value: a.id,
    }))
])

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
        await store.updateExpense(props.expenseId, budgetIdToSubmit, date.value, amount.value.toString(), note.value, selectedAccountId.value === '__none__' ? null : selectedAccountId.value)
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
    <!-- Choose budget page -->
    <template v-if="choosingBudget">
        <BudgetsChooseBudget
            :budgets="store.budgets"
            :expenses-only="true"
            @select="handleBudgetSelect"
        />
        <div class="mt-4">
            <UButton color="neutral" variant="ghost" @click="choosingBudget = false">Cancel</UButton>
        </div>
    </template>

    <!-- Edit form page -->
    <template v-else>
        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <div class="space-y-6">
            <!-- Budget pill -->
            <button
                type="button"
                class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                @click="choosingBudget = true"
                aria-label="Change budget"
            >
                <div
                    v-if="chosenBudget"
                    class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    :style="chosenBudget.color ? { backgroundColor: chosenBudget.color + '33', borderColor: chosenBudget.color, border: '1.5px solid' } : {}"
                    :class="!chosenBudget.color ? 'bg-gray-100 dark:bg-gray-800 border border-gray-300' : ''"
                >
                    <UIcon
                        :name="budgetIcon(chosenBudget.name)"
                        class="size-3"
                        :style="chosenBudget.color ? { color: chosenBudget.color } : {}"
                        :class="!chosenBudget.color ? 'text-gray-500' : ''"
                    />
                </div>
                <div v-else class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
                    <UIcon name="heroicons:x-mark" class="size-3 text-gray-400" />
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-300">{{ chosenBudget?.name ?? 'No budget' }}</span>
                <UIcon name="heroicons:pencil-square" class="size-3.5 text-gray-400 ml-0.5" />
            </button>

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

            <UFormField label="Account">
                <USelect
                    v-model="selectedAccountId"
                    :items="accountOptions"
                    size="xl"
                    color="info"
                    style="min-width: 200px;"
                />
            </UFormField>

            <div class="flex gap-3">
                <UButton
                    color="secondary"
                    class="flex-1 justify-center"
                    @click="handleUpdate"
                    :loading="loading"
                    :disabled="loading || deleting"
                >
                    Update Expense
                </UButton>
                <UButton
                    color="neutral"
                    variant="ghost"
                    class="flex-1 justify-center"
                    @click="emit('cancel')"
                    :disabled="loading || deleting"
                >
                    Cancel
                </UButton>
            </div>
        </div>
    </template>
</template>

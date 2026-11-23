<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { getMissingBudgetPeriodMessage } from '~/utils/budgetErrors'
import { accountDisplayName } from '../../utils/accountAppearance'

const props = defineProps<{
    expenseId: string
    expenseAmount?: number
    expenseDate?: string
    expenseEntity?: string | null
    expenseNotes?: string | null
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
const existingHit = computed(() => store.budgetHits.find((h: any) => h.id === props.expenseId) ?? null)

const amount = ref(props.expenseAmount ?? 0)
const date = ref(props.expenseDate ? props.expenseDate.slice(0, 10) : new Date().toLocaleDateString('en-CA'))
const entity = ref(props.expenseEntity ?? '')
const notes = ref(props.expenseNotes ?? existingHit.value?.notes ?? '')
const noBudget = ref(!props.expenseBudgetId)
const selectedBudgetId = ref(props.expenseBudgetId ?? '')
const choosingBudget = ref(false)

// The modal opens on a read-only summary; the pencil switches to the editable form.
const editing = ref(false)

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
        label: accountDisplayName(a),
        value: a.id,
    }))
])

// Existing payees for the chosen budget, the same suggestions the create flow shows.
const entitySuggestions = computed((): string[] => {
    if (noBudget.value || !selectedBudgetId.value) return []
    return store.budgetAllEntities.get(selectedBudgetId.value) ?? []
})

watch(() => [editing.value, noBudget.value, selectedBudgetId.value] as const, ([isEditing, none, budgetId]) => {
    if (!isEditing || none || !budgetId || store.budgetAllEntities.has(budgetId)) return
    // Offline or failed: the picker still works with typed names.
    store.fetchBudgetEntities(budgetId).catch(() => {})
}, { immediate: true })

const summaryAccountName = computed(() => {
    const account = store.accounts.find((a: any) => a.id === immutableAccountId.value)
    return account ? accountDisplayName(account) : 'No account'
})

const summaryAmount = computed(() =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount.value) || 0)
)

const summaryDate = computed(() => {
    if (!date.value) return ''
    const [year, month, day] = date.value.split('-').map(Number)
    return new Date(year!, (month ?? 1) - 1, day ?? 1).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
})

function startEditing() {
    error.value = null
    editing.value = true
}

// Cancel in edit mode discards the changes and goes back to the summary.
function cancelEditing() {
    amount.value = props.expenseAmount ?? 0
    date.value = props.expenseDate ? props.expenseDate.slice(0, 10) : new Date().toLocaleDateString('en-CA')
    entity.value = props.expenseEntity ?? ''
    notes.value = props.expenseNotes ?? existingHit.value?.notes ?? ''
    noBudget.value = !props.expenseBudgetId
    selectedBudgetId.value = props.expenseBudgetId ?? ''
    selectedAccountId.value = immutableAccountId.value ?? '__none__'
    error.value = null
    choosingBudget.value = false
    editing.value = false
}

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
        await store.updateExpense(
            props.expenseId,
            budgetIdToSubmit,
            date.value,
            amount.value.toString(),
            entity.value,
            selectedAccountId.value === '__none__' ? null : selectedAccountId.value,
            notes.value
        )
        emit('update')
    } catch (err: any) {
        error.value = getMissingBudgetPeriodMessage(err, chosenBudget.value?.name ?? 'This budget', date.value)
            || err?.message
            || 'Error updating expense'
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

    <!-- Read-only summary -->
    <template v-else-if="!editing">
        <div v-if="error" class="mb-4">
            <UAlert title="Error" :description="error" color="error" variant="soft" />
        </div>

        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
                <div
                    v-if="chosenBudget"
                    class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    :style="chosenBudget.color ? { backgroundColor: chosenBudget.color + '33', borderColor: chosenBudget.color, border: '1.5px solid' } : {}"
                    :class="!chosenBudget.color ? 'bg-gray-100 dark:bg-gray-800 border border-gray-300' : ''"
                >
                    <UIcon
                        :name="budgetIcon(chosenBudget.name)"
                        class="size-3.5"
                        :style="chosenBudget.color ? { color: chosenBudget.color } : {}"
                        :class="!chosenBudget.color ? 'text-gray-500' : ''"
                    />
                </div>
                <div v-else class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
                    <UIcon name="heroicons:x-mark" class="size-3.5 text-gray-400" />
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-300">{{ chosenBudget?.name ?? 'No budget' }}</span>
            </div>
            <UButton
                icon="heroicons:pencil-square"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Edit expense"
                @click="startEditing"
            />
        </div>

        <p class="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{{ summaryAmount }}</p>

        <dl class="mt-5 space-y-4">
            <SummaryField label="Date">{{ summaryDate }}</SummaryField>
            <SummaryField label="Payee">
                <span v-if="entity">{{ entity }}</span>
                <span v-else class="text-gray-400">None</span>
            </SummaryField>
            <SummaryField label="Account">{{ summaryAccountName }}</SummaryField>
            <SummaryField v-if="notes" label="Notes">
                <span class="whitespace-pre-wrap">{{ notes }}</span>
            </SummaryField>
        </dl>

        <div class="mt-6">
            <UButton color="neutral" variant="ghost" class="w-full justify-center" @click="emit('cancel')">Close</UButton>
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

            <EntityField v-model="entity" :is-income="false" :suggestions="entitySuggestions" />

            <UFormField label="Notes">
                <UTextarea
                    v-model="notes"
                    highlight
                    color="info"
                    placeholder="Add notes..."
                    :rows="4"
                    class="w-full"
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
                    @click="cancelEditing"
                    :disabled="loading || deleting"
                >
                    Cancel
                </UButton>
            </div>
        </div>
    </template>
</template>

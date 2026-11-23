<script setup lang="ts">
import { accountDisplayName } from '../../utils/accountAppearance'

const props = defineProps<{
    incomeId: string
    incomeAmount?: number
    incomeDate?: string
    incomeEntity?: string | null
    incomeBudgetId?: string | null
    incomeAccountId?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const store = useFinanceStore()

const amount = ref(props.incomeAmount ?? 0)
const date = ref(props.incomeDate ? props.incomeDate.slice(0, 10) : new Date().toLocaleDateString('en-CA'))
const entity = ref(props.incomeEntity ?? '')
const selectedBudgetId = ref<string>(props.incomeBudgetId ?? '__none__')

// The modal opens on a read-only summary; the pencil switches to the editable form.
const editing = ref(false)

const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

const immutableAccountId = computed<string | null>(() => {
    if (props.incomeAccountId !== undefined) return props.incomeAccountId
    const row = store.income.find((r: any) => r.id === props.incomeId)
    return row?.account_id ?? null
})

const selectedAccountId = ref<string>(immutableAccountId.value ?? '__none__')

const accountOptions = computed(() => [
    { label: 'No account', value: '__none__' },
    ...store.accounts.map((a: any) => ({
        label: accountDisplayName(a),
        value: a.id,
    }))
])
const budgetOptions = computed(() => [
    { label: 'No income budget', value: '__none__' },
    ...store.incomeBudgets.map((budget: any) => ({ label: budget.name, value: budget.id })),
])

// Existing payers for the chosen income budget, the same suggestions the create flow shows.
const entitySuggestions = computed((): string[] => {
    if (selectedBudgetId.value === '__none__') return []
    return store.budgetAllEntities.get(selectedBudgetId.value) ?? []
})

watch(() => [editing.value, selectedBudgetId.value] as const, ([isEditing, budgetId]) => {
    if (!isEditing || budgetId === '__none__' || store.budgetAllEntities.has(budgetId)) return
    // Offline or failed: the picker still works with typed names.
    store.fetchBudgetEntities(budgetId).catch(() => {})
}, { immediate: true })

const summaryBudgetName = computed(() => {
    if (selectedBudgetId.value === '__none__') return 'No income budget'
    return store.incomeBudgets.find((b: any) => b.id === selectedBudgetId.value)?.name ?? 'No income budget'
})

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
    amount.value = props.incomeAmount ?? 0
    date.value = props.incomeDate ? props.incomeDate.slice(0, 10) : new Date().toLocaleDateString('en-CA')
    entity.value = props.incomeEntity ?? ''
    selectedBudgetId.value = props.incomeBudgetId ?? '__none__'
    selectedAccountId.value = immutableAccountId.value ?? '__none__'
    error.value = null
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
        await store.updateIncome(
            props.incomeId,
            Number(amount.value),
            date.value,
            entity.value,
            selectedBudgetId.value === '__none__' ? null : selectedBudgetId.value,
            selectedAccountId.value === '__none__' ? null : selectedAccountId.value
        )
        emit('update')
    } catch (err: any) {
        error.value = err?.message || 'Error updating income'
        console.error('Error updating income:', err)
    } finally {
        loading.value = false
    }
}

async function handleDelete() {
    if (!confirm('Are you sure you want to delete this income record? This action cannot be undone.')) return
    try {
        deleting.value = true
        error.value = null
        await store.removeIncome(props.incomeId)
        emit('delete')
    } catch (err: any) {
        error.value = err?.message || 'Error deleting income'
        console.error('Error deleting income:', err)
        deleting.value = false
    }
}
</script>

<template>
    <!-- Read-only summary -->
    <template v-if="!editing">
        <div v-if="error" class="mb-4">
            <UAlert title="Error" :description="error" color="error" variant="soft" />
        </div>

        <div class="flex items-start justify-between gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">{{ summaryBudgetName }}</span>
            <UButton
                icon="heroicons:pencil-square"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Edit income"
                @click="startEditing"
            />
        </div>

        <p class="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{{ summaryAmount }}</p>

        <dl class="mt-5 space-y-4">
            <SummaryField label="Date">{{ summaryDate }}</SummaryField>
            <SummaryField label="Payer">
                <span v-if="entity">{{ entity }}</span>
                <span v-else class="text-gray-400">None</span>
            </SummaryField>
            <SummaryField label="Account">{{ summaryAccountName }}</SummaryField>
        </dl>

        <div class="mt-6">
            <UButton color="neutral" variant="ghost" class="w-full justify-center" @click="emit('cancel')">Close</UButton>
        </div>
    </template>

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
        <UFormField label="Amount" required>
            <UInput
                v-model="amount"
                highlight
                color="info"
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
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

        <EntityField v-model="entity" :is-income="true" :suggestions="entitySuggestions" />

        <UFormField label="Account">
            <USelect
                v-model="selectedAccountId"
                :items="accountOptions"
                size="xl"
                color="info"
                style="min-width: 200px;"
            />
        </UFormField>

        <UFormField label="Income budget">
            <USelect v-model="selectedBudgetId" :items="budgetOptions" size="xl" color="info" />
        </UFormField>

        <div class="flex gap-3">
            <UButton
                color="secondary"
                class="flex-1 justify-center"
                @click="handleUpdate"
                :loading="loading"
                :disabled="loading || deleting"
            >
                Update Income
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

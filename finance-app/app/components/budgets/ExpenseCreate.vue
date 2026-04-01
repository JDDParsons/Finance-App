<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const props = defineProps<{
    budgetId?: string,
    budgetName?: string,
    budgets?: any[]
}>()

const selectedBudgetId = ref(props.budgetId ?? '')
const noBudget = ref(false)
const store = useFinanceStore()

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
const expenseAccountId = ref<string | null>(store.defaultExpenseAccount?.id ?? null)
const { show: showOverlay } = useSuccessOverlay()

const accountItems = computed(() =>
    store.accounts.map((a: any) => ({ label: a.name || a.institution || 'Account', value: a.id }))
)

const activeBudgetId = computed(() => {
    if (noBudget.value) return null
    return props.budgetId || selectedBudgetId.value || null
})

const noteSuggestions = computed((): string[] => {
    if (!activeBudgetId.value) return []
    const seen = new Set<string>()
    const results: string[] = []
    const allHits = [...(store.budgetHits as any[]), ...(store.prevMonthBudgetHits as any[])]
    for (const h of allHits) {
        const n = h.note?.trim()
        if (h.budget_id === activeBudgetId.value && n && !seen.has(n)) {
            seen.add(n)
            results.push(n)
        }
    }
    return results.slice(0, 8)
})

let closeTimer: ReturnType<typeof setTimeout> | null = null
const CLOSE_AFTER_SUCCESS_MS = 1500

onBeforeUnmount(() => {
    if (closeTimer) {
        clearTimeout(closeTimer)
    }
})

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
            await store.addExpense(budgetIdToSubmit, date.value, amount.value, note.value, expenseAccountId.value)
            showOverlay()

            closeTimer = setTimeout(() => {
                emit('update')
                emit('cancel')
            }, CLOSE_AFTER_SUCCESS_MS)
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
    <div class="w-full ml-3">

        <h3 class="text-2xl font-semibold text-gray-500 pb-4 pt-4">Add Expense</h3>

        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <!-- Mobile: stacked; Desktop: 4-column grid -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-x-6 gap-y-6">
            <UFormField label="Amount" required>
                <UInput
                    v-model="amount"
                    highlight
                    color="primary"
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
                    color="primary"
                    type="date"
                    size="xl"
                />
            </UFormField>
            
            <UFormField label="Note">
                <UInput
                    v-model="note"
                    highlight
                    color="primary"
                    placeholder="Leave a note..."
                    type="text"
                    size="xl"
                />
            </UFormField>

            <UFormField label="Account">
                <USelect
                    v-model="expenseAccountId"
                    :items="accountItems"
                    placeholder="Select an account..."
                    size="xl"
                    color="primary"
                    highlight
                />
            </UFormField>

            <!-- Note suggestions -->
            <div v-if="noteSuggestions.length" class="lg:col-span-4 flex flex-wrap gap-2">
                <p class="w-full text-xs text-gray-400 mb-1">Previous notes:</p>
                <button
                    v-for="suggestion in noteSuggestions"
                    :key="suggestion"
                    type="button"
                    class="px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer"
                    @click="note = suggestion"
                >
                    {{ suggestion }}
                </button>
            </div>

            <template v-if="!props.budgetId && props.budgets?.length">
                <UFormField label="Budget" :required="!noBudget">
                    <USelect
                        v-model="selectedBudgetId"
                        :items="props.budgets.map((b: any) => ({ label: b.name, value: b.id }))"
                        placeholder="Select a budget..."
                        size="xl"
                        color="primary"
                        highlight
                        :disabled="noBudget"
                    />
                </UFormField>
                <UCheckbox v-model="noBudget" color="primary" label="No budget" />
            </template>
        </div>

        <UButton
            color="primary"
            variant="solid"
            @click="handleCreateHit"
            class="mt-6"
            :disabled="loading"
            :loading="loading"
        >
            Submit expense
        </UButton>
    </div>
</template>

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

// Two-step flow: 'choose-budget' → 'form'
// Skip budget selection if a budgetId was already provided via prop
const step = ref<'choose-budget' | 'form'>(props.budgetId ? 'form' : 'choose-budget')

const chosenBudgetName = ref<string | null>(props.budgetName ?? null)

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean }) {
    selectedBudgetId.value = selection.budgetId ?? ''
    noBudget.value = selection.noBudget
    chosenBudgetName.value = selection.budgetName
    step.value = 'form'
}

function goBack() {
    step.value = 'choose-budget'
}

const { budgetIcon } = useBudgetIcon()

const chosenBudget = computed(() => {
    if (noBudget.value) return null
    return store.budgets.find((b: any) => b.id === selectedBudgetId.value) ?? null
})

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
    <div class="w-full">

        <!-- Step 1: Choose budget -->
        <template v-if="step === 'choose-budget'">
            <BudgetsChooseBudget
                :budgets="props.budgets ?? store.budgets"
                @select="handleBudgetSelect"
            />
            <div class="mt-4">
                <UButton color="neutral" variant="ghost" @click="handleCancel">Cancel</UButton>
            </div>
        </template>

        <!-- Step 2: Expense form -->
        <template v-else>
            <div class="ml-3">
                <!-- Selected budget indicator + back button -->
                <div v-if="!props.budgetId" class="flex items-center gap-2 mb-5">
                    <button
                        type="button"
                        class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                        @click="goBack"
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
                </div>

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
                </div>

                <div class="flex items-center gap-3 mt-6">
                    <UButton
                        color="primary"
                        variant="solid"
                        @click="handleCreateHit"
                        :disabled="loading"
                        :loading="loading"
                    >
                        Submit expense
                    </UButton>
                    <UButton color="neutral" variant="ghost" @click="handleCancel">Cancel</UButton>
                </div>
            </div>
        </template>
    </div>
</template>

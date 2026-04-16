<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import AmountNumberPad from '~/components/AmountNumberPad.vue'
import AccountTagPicker from '~/components/AccountTagPicker.vue'
import BudgetTagPicker from '~/components/BudgetTagPicker.vue'
import DateTagPicker from '~/components/DateTagPicker.vue'

const props = defineProps<{
    budgetId?: string,
    budgetName?: string,
    budgets?: any[]
}>()

const selectedBudgetId = ref(props.budgetId ?? '')
const noBudget = ref(false)
const store = useFinanceStore()

// Multi-step flow: 'choose-budget' → 'form' | 'income-form'
// Skip budget selection if a budgetId was already provided via prop
const step = ref<'choose-budget' | 'form' | 'income-form'>(props.budgetId ? 'form' : 'choose-budget')

const chosenBudgetName = ref<string | null>(props.budgetName ?? null)

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
    if (selection.type === 'income') {
        step.value = 'income-form'
        return
    }
    selectedBudgetId.value = selection.budgetId ?? ''
    noBudget.value = selection.noBudget
    chosenBudgetName.value = selection.budgetName
    step.value = 'form'
}

function goBack() {
    step.value = 'choose-budget'
}

function handleBudgetPillChange(budgetId: string | null) {
    selectedBudgetId.value = budgetId ?? ''
    noBudget.value = budgetId === null
}

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
const appliedNoteSuggestion = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const expenseAccountId = ref<string | null>(store.defaultExpenseAccount?.id ?? null)

// Income form fields
const incomeAmount = ref('')
const incomeDate = ref(new Date().toISOString().split('T')[0])
const incomeNote = ref('')
const incomeAccountId = ref<string | null>(store.defaultIncomeAccount?.id ?? null)

async function handleCreateIncome() {
    if (!incomeAmount.value) { alert('Please enter an amount'); return }
    if (!incomeDate.value) { alert('Please select a date'); return }
    try {
        loading.value = true
        error.value = null
        await store.addIncome(parseFloat(incomeAmount.value), incomeDate.value, incomeNote.value, incomeAccountId.value)
        showOverlay()
        closeTimer = setTimeout(() => {
            emit('update')
            emit('cancel')
        }, CLOSE_AFTER_SUCCESS_MS)
    } catch (err: any) {
        error.value = err?.message || 'Error recording income'
        alert(error.value)
    } finally {
        loading.value = false
    }
}
const { show: showOverlay } = useSuccessOverlay()

const activeBudgetId = computed(() => {
    if (noBudget.value) return null
    return props.budgetId || selectedBudgetId.value || null
})

const noteSuggestions = computed((): string[] => {
    if (!activeBudgetId.value) return []
    const query = note.value.trim().toLowerCase()
    if (!query) return []
    if (appliedNoteSuggestion.value === note.value) return []
    const seen = new Set<string>()
    const results: string[] = []
    const allHits = [...(store.budgetHits as any[]), ...(store.prevMonthBudgetHits as any[])]
    for (const h of allHits) {
        const n = h.note?.trim()
        if (h.budget_id === activeBudgetId.value && n && n.toLowerCase().includes(query) && !seen.has(n)) {
            seen.add(n)
            results.push(n)
        }
    }
    return results.slice(0, 8)
})

watch(note, (newValue) => {
    if (appliedNoteSuggestion.value && newValue !== appliedNoteSuggestion.value) {
        appliedNoteSuggestion.value = null
    }
})

function applyNoteSuggestion(suggestion: string) {
    note.value = suggestion
    appliedNoteSuggestion.value = suggestion
}

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

        <!-- Step 2b: Income form -->
        <template v-else-if="step === 'income-form'">
            <div class="ml-3">
                <div class="mb-5 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                        @click="goBack"
                        aria-label="Change type"
                    >
                        <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-900/30 border border-green-400">
                            <UIcon name="heroicons:banknotes-solid" class="size-3 text-green-500" />
                        </div>
                        <span class="text-sm text-gray-600 dark:text-gray-300">Paycheck</span>
                        <UIcon name="heroicons:pencil-square" class="size-3.5 text-gray-400 ml-0.5" />
                    </button>

                    <DateTagPicker v-model="incomeDate" />
                    <AccountTagPicker v-model="incomeAccountId" :accounts="store.accounts" />
                </div>

                <div v-if="error" class="mb-4">
                    <UAlert title="Error" :description="error" color="error" variant="soft" />
                </div>

                <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                        <AmountNumberPad v-model="incomeAmount" />
                    </div>

                    <div class="space-y-6">
                        <UFormField label="Note">
                            <UInput
                                v-model="incomeNote"
                                highlight
                                color="primary"
                                placeholder="Leave a note..."
                                type="text"
                                size="xl"
                            />
                        </UFormField>

                    </div>
                </div>

                <div class="flex items-center gap-3 mt-6">
                    <UButton
                        color="primary"
                        variant="solid"
                        @click="handleCreateIncome"
                        :disabled="loading"
                        :loading="loading"
                    >
                        Submit income
                    </UButton>
                    <UButton color="neutral" variant="ghost" @click="handleCancel">Cancel</UButton>
                </div>
            </div>
        </template>

        <!-- Step 2a: Expense form -->
        <template v-else>
            <div class="ml-3">
                <div class="mb-5 flex flex-wrap items-center gap-2">
                    <div v-if="!props.budgetId" class="flex items-center gap-2">
                        <BudgetTagPicker
                            :model-value="noBudget ? null : selectedBudgetId"
                            :budgets="props.budgets ?? store.budgets"
                            @update:model-value="handleBudgetPillChange"
                        />
                    </div>

                    <DateTagPicker v-model="date" />
                    <AccountTagPicker v-model="expenseAccountId" :accounts="store.accounts" />
                </div>

                <div v-if="error" class="mb-4">
                    <UAlert
                        title="Error"
                        :description="error"
                        color="error"
                        variant="soft"
                    />
                </div>

                <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                        <AmountNumberPad v-model="amount" />
                    </div>

                    <div class="space-y-3">
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

                        <div v-if="noteSuggestions.length" class="flex flex-wrap gap-2 pt-1">
                            <button
                                v-for="suggestion in noteSuggestions"
                                :key="suggestion"
                                type="button"
                                class="px-3 py-1 text-sm rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                                @click="applyNoteSuggestion(suggestion)"
                            >
                                {{ suggestion }}
                            </button>
                        </div>
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

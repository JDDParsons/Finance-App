<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import AmountNumberPad from '~/components/AmountNumberPad.vue'
import AccountTagPicker from '~/components/AccountTagPicker.vue'
import DateTagPicker from '~/components/DateTagPicker.vue'

const props = defineProps<{
    budgetId?: string,
    budgetName?: string,
    budgets?: any[]
}>()

const selectedBudgetId = ref(props.budgetId ?? '')
const noBudget = ref(false)
const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

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
const noteSuggestionsOpen = ref(false)
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

const expensePillBudget = computed(() => {
    if (!activeBudgetId.value) return null
    return (props.budgets ?? store.budgets).find((budget: any) => budget.id === activeBudgetId.value) ?? null
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

    if (!newValue.trim()) {
        noteSuggestionsOpen.value = false
    }
})

watch(noteSuggestions, (suggestions) => {
    if (!suggestions.length) {
        noteSuggestionsOpen.value = false
    }
})

function handleNoteFocus() {
    if (noteSuggestions.value.length) {
        noteSuggestionsOpen.value = true
    }
}

function applyNoteSuggestion(suggestion: string) {
    note.value = suggestion
    appliedNoteSuggestion.value = suggestion
    noteSuggestionsOpen.value = false
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
            <div class="p-4">
                <div class="mb-5">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Add a transaction</h2>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a budget to add an expense to it</p>
                </div>
                <BudgetsChooseBudget
                    :budgets="props.budgets ?? store.budgets"
                    @select="handleBudgetSelect"
                />
                <div class="mt-4 flex justify-end">
                    <UButton color="neutral" variant="ghost" @click="handleCancel">Cancel</UButton>
                </div>
            </div>
        </template>

        <!-- Step 2b: Income form -->
        <template v-else-if="step === 'income-form'">
            <div>
                <div v-if="error" class="mb-4">
                    <UAlert title="Error" :description="error" color="error" variant="soft" />
                </div>

                <div class="overflow-hidden">
                    <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                        <UInput
                            v-model="incomeNote"
                            variant="ghost"
                            color="neutral"
                            placeholder="Enter a note...."
                            type="text"
                            size="xl"
                            class="w-full"
                            :ui="{ base: 'px-0 text-lg', trailing: 'hidden', leading: 'hidden' }"
                        />
                    </div>

                    <AmountNumberPad v-model="incomeAmount" variant="wireframe">
                        <template #controls>
                            <div class="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    type="button"
                                    class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                                    @click="goBack"
                                    aria-label="Change type"
                                >
                                    <div class="flex size-7 shrink-0 items-center justify-center rounded-full border border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/30">
                                        <UIcon name="heroicons:banknotes-solid" class="size-4 text-green-500" />
                                    </div>
                                    <span>Paycheck</span>
                                </button>
                                <DateTagPicker v-model="incomeDate" />
                                <AccountTagPicker v-model="incomeAccountId" :accounts="store.accounts" />
                            </div>
                        </template>
                    </AmountNumberPad>

                    <div class="mt-4 grid grid-cols-2 border-t border-gray-200 dark:border-gray-800">
                        <UButton
                            color="primary"
                            variant="solid"
                            class="h-18 rounded-none justify-center text-base font-medium text-black hover:bg-green-600 dark:text-black"
                            @click="handleCreateIncome"
                            :disabled="loading"
                            :loading="loading"
                        >
                            Submit income
                        </UButton>
                        <UButton
                            color="neutral"
                            variant="ghost"
                            class="h-18 rounded-none justify-center border-l border-gray-200 text-base font-medium dark:border-gray-800"
                            @click="handleCancel"
                        >
                            Cancel
                        </UButton>
                    </div>
                </div>
            </div>
        </template>

        <!-- Step 2a: Expense form -->
        <template v-else>
            <div>
                <div v-if="error" class="mb-4">
                    <UAlert
                        title="Error"
                        :description="error"
                        color="error"
                        variant="soft"
                    />
                </div>

                <div class="overflow-hidden">
                    <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                        <UPopover v-model:open="noteSuggestionsOpen">
                            <UInput
                                v-model="note"
                                variant="ghost"
                                color="neutral"
                                placeholder="Enter a note...."
                                type="text"
                                size="xl"
                                class="w-full"
                                :ui="{ base: 'px-0 text-lg', trailing: 'hidden', leading: 'hidden' }"
                                @focus="handleNoteFocus"
                                @click="handleNoteFocus"
                            />

                            <template #content>
                                <div class="max-w-sm p-2">
                                    <div class="flex flex-wrap gap-2">
                                        <button
                                            v-for="suggestion in noteSuggestions"
                                            :key="suggestion"
                                            type="button"
                                            class="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-700 transition-colors cursor-pointer hover:border-green-300 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50"
                                            @click="applyNoteSuggestion(suggestion)"
                                        >
                                            {{ suggestion }}
                                        </button>
                                    </div>
                                </div>
                            </template>
                        </UPopover>
                    </div>

                    <AmountNumberPad v-model="amount" variant="wireframe">
                        <template #controls>
                            <div class="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    v-if="!props.budgetId"
                                    type="button"
                                    class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                                    @click="goBack"
                                    :aria-label="expensePillBudget ? `Change budget from ${expensePillBudget.name}` : 'Choose budget'"
                                >
                                    <div
                                        v-if="expensePillBudget"
                                        class="flex size-7 shrink-0 items-center justify-center rounded-full"
                                        :style="expensePillBudget.color ? { backgroundColor: `${expensePillBudget.color}33`, borderColor: expensePillBudget.color, border: '1.5px solid' } : {}"
                                        :class="!expensePillBudget.color ? 'border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800' : ''"
                                    >
                                        <UIcon
                                            :name="expensePillBudget.icon ?? budgetIcon(expensePillBudget.name)"
                                            class="size-4"
                                            :style="expensePillBudget.color ? { color: expensePillBudget.color } : {}"
                                            :class="!expensePillBudget.color ? 'text-gray-500 dark:text-gray-400' : ''"
                                        />
                                    </div>
                                    <div
                                        v-else
                                        class="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
                                    >
                                        <UIcon name="heroicons:x-mark" class="size-4 text-gray-400" />
                                    </div>
                                    <span class="max-w-32 truncate">{{ expensePillBudget?.name ?? chosenBudgetName ?? 'No budget' }}</span>
                                </button>
                                <DateTagPicker v-model="date" />
                                <AccountTagPicker v-model="expenseAccountId" :accounts="store.accounts" />
                            </div>
                        </template>
                    </AmountNumberPad>

                    <div class="mt-4 grid grid-cols-2 border-t border-gray-200 dark:border-gray-800">
                        <UButton
                            color="primary"
                            variant="solid"
                            class="h-18 rounded-none justify-center text-base font-medium text-black hover:bg-green-600 dark:text-black"
                            @click="handleCreateHit"
                            :disabled="loading"
                            :loading="loading"
                        >
                            Submit expense
                        </UButton>
                        <UButton
                            color="neutral"
                            variant="ghost"
                            class="h-18 rounded-none justify-center border-l border-gray-200 text-base font-medium dark:border-gray-800"
                            @click="handleCancel"
                        >
                            Cancel
                        </UButton>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

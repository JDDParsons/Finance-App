<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSelectedMonthTitle } from '~/composables/useSelectedMonthTitle'
import { useFinanceStore } from '~/stores/finance'
import { getBudgetErrorMessage, isDuplicateBudgetNameError, isInvalidBudgetAmountError } from '~/utils/budgetErrors'
import { useBudgetIcon } from '~/composables/useBudgetIcon'

useHead({ title: 'Budgets | R&J Finance' })

const store = useFinanceStore()
const router = useRouter()
const { monthTitle } = useSelectedMonthTitle()
const { budgetIcon } = useBudgetIcon()
const searchText = ref('')

const displayBudgets = ref<any[]>([])
const loading = computed(() => store.loading)
const error = computed(() => store.error)

// Keep displayBudgets in sync with store; re-apply search filter and default sort (amount descending)
watchEffect(() => {
    const q = searchText.value.toLowerCase().trim()
    const filtered = q
        ? store.budgets.filter((b: any) => b.name.toLowerCase().includes(q))
        : [...store.budgets]
    displayBudgets.value = filtered.sort((a: any, b: any) => (b.currentPeriod?.amount || 0) - (a.currentPeriod?.amount || 0))
})


const isSlideoverOpen = ref(false)
const budgetName = ref('')
const amount = ref('')
const budgetColor = ref('#6366f1')
const budgetIconChoice = ref<string | null>(null)
const createLoading = ref(false)
const availableLoading = ref(false)
const addingExistingBudgetId = ref<string | null>(null)
const availableError = ref<string | null>(null)
const selectedExistingBudgetId = ref<string | null>(null)
const existingAmount = ref('')
const budgetNameError = ref<string | null>(null)
const amountError = ref<string | null>(null)
const existingAmountError = ref<string | null>(null)
const copyPreview = ref<any | null>(null)
const copyPreviewLoading = ref(false)
const copyError = ref<string | null>(null)
const copyMessage = ref<string | null>(null)
const isCopyModalOpen = ref(false)
const copyLoading = ref(false)

watch(budgetName, () => {
    budgetNameError.value = null
})

watch(amount, () => {
    amountError.value = null
})

watch(isSlideoverOpen, async (open) => {
    if (!open) return
    try {
        availableLoading.value = true
        availableError.value = null
        await store.fetchAvailableBudgets()
    } catch (error: any) {
        availableError.value = error?.message || 'Unable to load available budgets.'
    } finally {
        availableLoading.value = false
    }
})

watch(existingAmount, () => { existingAmountError.value = null })

watch(
    () => [store.selectedMonth.year, store.selectedMonth.month, store.budgets.length],
    () => loadCopyPreview(),
    { immediate: true }
)


function validateBudgetForm() {
    if (!budgetName.value.trim()) {
        alert('Please enter a budget name')
        return false
    }
    return true
}

async function handleCreateBudget() {
    if (validateBudgetForm()) {
        try {
            createLoading.value = true
            budgetNameError.value = null
            amountError.value = null
            await store.addBudget(budgetName.value, amount.value, budgetColor.value, budgetIconChoice.value)
            budgetName.value = ''
            amount.value = ''
            isSlideoverOpen.value = false
        } catch (error: any) {
            if (isDuplicateBudgetNameError(error)) {
                budgetNameError.value = 'A budget with this name already exists.'
            } else if (isInvalidBudgetAmountError(error)) {
                amountError.value = 'Amount must be greater than 0.'
            } else {
                alert('Error creating budget: ' + getBudgetErrorMessage(error, 'Unknown error'))
            }
        } finally {
            createLoading.value = false
        }
    }
}

function selectExistingBudget(budget: any) {
    selectedExistingBudgetId.value = budget.id
    existingAmount.value = budget.suggestedAmount?.toString() ?? ''
    existingAmountError.value = null
}

async function handleAddExistingBudget() {
    if (!selectedExistingBudgetId.value) return
    if (!(Number(existingAmount.value) > 0)) {
        existingAmountError.value = 'Amount must be greater than 0.'
        return
    }
    try {
        addingExistingBudgetId.value = selectedExistingBudgetId.value
        availableError.value = null
        await store.addExistingBudget(selectedExistingBudgetId.value, existingAmount.value)
        closeSlideover()
    } catch (error: any) {
        availableError.value = getBudgetErrorMessage(error, 'Unable to add this budget.')
    } finally {
        addingExistingBudgetId.value = null
    }
}

async function loadCopyPreview() {
    try {
        copyPreviewLoading.value = true
        copyError.value = null
        copyPreview.value = await store.getCopyPreview()
    } catch (error: any) {
        copyPreview.value = null
        copyError.value = getBudgetErrorMessage(error, 'Unable to check the previous month.')
    } finally {
        copyPreviewLoading.value = false
    }
}

const copyDisabledReason = computed(() => {
    if (copyError.value) return copyError.value
    if (!copyPreview.value || copyPreview.value.sourceCount === 0) return 'No budgets last month'
    if (copyPreview.value.eligibleCount === 0) return 'All budgets already copied'
    return undefined
})

function formatMonth(year: number, month: number) {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, month - 1, 1)))
}

async function handleCopyPreviousMonth() {
    try {
        copyLoading.value = true
        copyError.value = null
        copyMessage.value = null
        const result = await store.copyPreviousMonthBudgets()
        copyMessage.value = `${result.copiedCount} budget${result.copiedCount === 1 ? '' : 's'} copied from the previous month.`
        isCopyModalOpen.value = false
        await loadCopyPreview()
    } catch (error: any) {
        copyError.value = getBudgetErrorMessage(error, 'Unable to copy budgets from the previous month.')
    } finally {
        copyLoading.value = false
    }
}

function closeSlideover() {
    isSlideoverOpen.value = false
    budgetName.value = ''
    amount.value = ''
    budgetColor.value = '#6366f1'
    budgetIconChoice.value = null
    budgetNameError.value = null
    amountError.value = null
    availableError.value = null
    selectedExistingBudgetId.value = null
    existingAmount.value = ''
    existingAmountError.value = null
}

function goToBudget(budgetId: string) {
    router.push(`/budgets/${budgetId}`)
}

function formatCurrency(value: number | string | null | undefined) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0)
}




</script>

<template>
  <div class="min-h-screen">
    <AppHeader title="Budgets" />

    <UContainer class="max-w-none">
        <!-- Budget Allocation Chart -->
        <div class="mt-4 mb-2">
          <BudgetsAllocationGaugeBar />
        </div>



        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <UAlert
            v-if="copyMessage"
            class="mb-4"
            color="success"
            variant="soft"
            :description="copyMessage"
            :close="{ onClick: () => copyMessage = null }"
        />

        <div v-if="loading" class="text-center py-12">
            <p class="text-gray-400">Loading budgets...</p>
        </div>

        <div v-else class="grid grid-cols-3 gap-3 pb-24 lg:pb-6 sm:grid-cols-3 lg:grid-cols-4">
            <BudgetsBudgetCard
                v-for="budget in displayBudgets"
                :key="budget.id"
                :budget="budget"
                @select="goToBudget"
            />
            <BudgetsAddBudgetCard @select="isSlideoverOpen = true" />
            <BudgetsCopyPreviousMonthCard
                :disabled="Boolean(copyDisabledReason)"
                :reason="copyDisabledReason"
                :loading="copyPreviewLoading"
                @select="isCopyModalOpen = true"
            />
        </div>

        <USlideover 
            v-model:open="isSlideoverOpen"
            class="w-full sm:max-w-md"
            >
            <template #content>
                <div class="flex flex-col h-full">
                    <div class="flex-1 p-6 overflow-y-auto">
                        <h3 class="text-2xl font-bold mb-6">Create a new budget</h3>
                        
                        <div class="space-y-6">
                            <UFormField label="Budget Name" :error="budgetNameError" required>
                                <UInput
                                    v-model="budgetName"
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
                                <BudgetsColorPicker v-model="budgetColor" />
                            </UFormField>

                            <UFormField label="Icon">
                                <BudgetsChooseIcon v-model="budgetIconChoice" :color="budgetColor" />
                            </UFormField>
                        </div>

                        <section class="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
                            <h4 class="text-lg font-semibold">Add an existing budget</h4>
                            <p class="mt-1 text-sm text-gray-500">
                                Reuse a shared budget in {{ monthTitle }}. Its name, colour, and icon stay shared across months.
                            </p>

                            <div v-if="availableLoading" class="flex justify-center py-6">
                                <UIcon name="heroicons-solid:arrow-path" class="size-6 animate-spin text-primary" />
                            </div>

                            <UAlert
                                v-else-if="availableError"
                                class="mt-4"
                                color="error"
                                variant="soft"
                                :description="availableError"
                            />

                            <p v-else-if="store.availableBudgets.length === 0" class="mt-4 text-sm text-gray-400">
                                Every shared budget is already in this month.
                            </p>

                            <div v-else class="mt-4 space-y-2">
                                <button
                                    v-for="budget in store.availableBudgets"
                                    :key="budget.id"
                                    type="button"
                                    class="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-900"
                                    :class="selectedExistingBudgetId === budget.id ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30' : 'border-gray-200 dark:border-gray-800'"
                                    :disabled="addingExistingBudgetId !== null || createLoading"
                                    @click="selectExistingBudget(budget)"
                                >
                                    <span
                                        class="flex size-10 shrink-0 items-center justify-center rounded-full"
                                        :style="budget.color ? { backgroundColor: `${budget.color}22`, color: budget.color } : {}"
                                    >
                                        <UIcon :name="budget.icon ?? budgetIcon(budget.name)" class="size-5" />
                                    </span>
                                    <span class="min-w-0 flex-1">
                                        <span class="block truncate font-medium">{{ budget.name }}</span>
                                        <span class="block text-sm text-gray-500">
                                            {{ budget.suggestedAmount ? `Last allocation: ${formatCurrency(budget.suggestedAmount)}` : 'No earlier allocation' }}
                                        </span>
                                    </span>
                                    <UIcon v-if="selectedExistingBudgetId === budget.id" name="heroicons:check-circle-solid" class="size-5 text-primary" />
                                </button>

                                <div v-if="selectedExistingBudgetId" class="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                    <UFormField label="Allocation for this month" :error="existingAmountError" required>
                                        <UInput v-model="existingAmount" type="number" step="0.01" placeholder="0.00" size="xl" />
                                    </UFormField>
                                    <UButton
                                        block
                                        color="primary"
                                        :loading="addingExistingBudgetId !== null"
                                        :disabled="createLoading || addingExistingBudgetId !== null"
                                        @click="handleAddExistingBudget"
                                    >
                                        Add to {{ monthTitle }}
                                    </UButton>
                                </div>
                            </div>
                        </section>
                    </div>
                    
                    <div class="p-6 border-t">
                        <div class="flex gap-3">
                            <UButton
                                color="primary"
                                @click="handleCreateBudget"
                                class="flex-1"
                                size="lg"
                                :loading="createLoading"
                                :disabled="createLoading || addingExistingBudgetId !== null"
                            >
                                Create this budget
                            </UButton>
                            <UButton
                                color="neutral"
                                variant="outline"
                                @click="closeSlideover"
                                class="flex-1"
                                size="lg"
                                :disabled="createLoading || addingExistingBudgetId !== null"
                            >
                                Close
                            </UButton>
                        </div>
                    </div>
                </div>
            </template>
        </USlideover>

        <UModal v-model:open="isCopyModalOpen">
            <template #content>
                <UCard>
                    <template #header>
                        <h2 class="text-2xl font-bold">Copy previous month</h2>
                    </template>
                    <div v-if="copyPreview" class="space-y-4">
                        <p>
                            Copy {{ copyPreview.eligibleCount }} budget{{ copyPreview.eligibleCount === 1 ? '' : 's' }}
                            from {{ formatMonth(copyPreview.source.year, copyPreview.source.month) }}
                            to {{ monthTitle }}?
                        </p>
                        <p v-if="copyPreview.skippedCount" class="text-sm text-gray-500">
                            {{ copyPreview.skippedCount }} existing budget{{ copyPreview.skippedCount === 1 ? '' : 's' }} will be skipped and keep their current allocations.
                            <span class="block">{{ copyPreview.skippedNames.join(', ') }}</span>
                        </p>
                        <UAlert v-if="copyError" color="error" variant="soft" :description="copyError" />
                        <div class="flex gap-3">
                            <UButton class="flex-1" color="primary" :loading="copyLoading" :disabled="copyLoading" @click="handleCopyPreviousMonth">
                                Copy budgets
                            </UButton>
                            <UButton class="flex-1" color="neutral" variant="outline" :disabled="copyLoading" @click="isCopyModalOpen = false">
                                Cancel
                            </UButton>
                        </div>
                    </div>
                </UCard>
            </template>
        </UModal>
    </UContainer>
  </div>
</template>

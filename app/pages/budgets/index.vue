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
const inactiveLoading = ref(false)
const restoringBudgetId = ref<string | null>(null)
const inactiveError = ref<string | null>(null)
const budgetNameError = ref<string | null>(null)
const amountError = ref<string | null>(null)

watch(budgetName, () => {
    budgetNameError.value = null
})

watch(amount, () => {
    amountError.value = null
})

watch(isSlideoverOpen, async (open) => {
    if (!open) return
    try {
        inactiveLoading.value = true
        inactiveError.value = null
        await store.fetchInactiveBudgets()
    } catch (error: any) {
        inactiveError.value = error?.message || 'Unable to load inactive budgets.'
    } finally {
        inactiveLoading.value = false
    }
})


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

async function handleRestoreBudget(id: string) {
    try {
        restoringBudgetId.value = id
        inactiveError.value = null
        await store.restoreBudget(id)
        closeSlideover()
    } catch (error: any) {
        inactiveError.value = error?.message || 'Unable to restore this budget.'
    } finally {
        restoringBudgetId.value = null
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
    inactiveError.value = null
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
                            <h4 class="text-lg font-semibold">Restore an inactive budget</h4>
                            <p class="mt-1 text-sm text-gray-500">
                                Restore a previous budget for the current month.
                            </p>

                            <div v-if="inactiveLoading" class="flex justify-center py-6">
                                <UIcon name="heroicons-solid:arrow-path" class="size-6 animate-spin text-primary" />
                            </div>

                            <UAlert
                                v-else-if="inactiveError"
                                class="mt-4"
                                color="error"
                                variant="soft"
                                :description="inactiveError"
                            />

                            <p v-else-if="store.inactiveBudgets.length === 0" class="mt-4 text-sm text-gray-400">
                                No inactive budgets.
                            </p>

                            <div v-else class="mt-4 space-y-2">
                                <button
                                    v-for="budget in store.inactiveBudgets"
                                    :key="budget.id"
                                    type="button"
                                    class="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:hover:bg-gray-900"
                                    :disabled="restoringBudgetId !== null || createLoading"
                                    @click="handleRestoreBudget(budget.id)"
                                >
                                    <span
                                        class="flex size-10 shrink-0 items-center justify-center rounded-full"
                                        :style="budget.color ? { backgroundColor: `${budget.color}22`, color: budget.color } : {}"
                                    >
                                        <UIcon :name="budget.icon ?? budgetIcon(budget.name)" class="size-5" />
                                    </span>
                                    <span class="min-w-0 flex-1">
                                        <span class="block truncate font-medium">{{ budget.name }}</span>
                                        <span class="block text-sm text-gray-500">{{ formatCurrency(budget.amount) }}</span>
                                    </span>
                                    <UIcon
                                        v-if="restoringBudgetId === budget.id"
                                        name="heroicons-solid:arrow-path"
                                        class="size-5 animate-spin"
                                    />
                                    <span v-else class="text-sm font-medium text-primary">Restore</span>
                                </button>
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
                                :disabled="createLoading || restoringBudgetId !== null"
                            >
                                Create this budget
                            </UButton>
                            <UButton
                                color="neutral"
                                variant="outline"
                                @click="closeSlideover"
                                class="flex-1"
                                size="lg"
                                :disabled="createLoading || restoringBudgetId !== null"
                            >
                                Close
                            </UButton>
                        </div>
                    </div>
                </div>
            </template>
        </USlideover>
    </UContainer>
  </div>
</template>

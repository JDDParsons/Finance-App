<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import AmountNumberPad from '~/components/AmountNumberPad.vue'
import AccountTagPicker from '~/components/AccountTagPicker.vue'
import DateTagPicker from '~/components/DateTagPicker.vue'

useHead({ title: 'Create Transaction | R&J Finance' })

const store = useFinanceStore()
const router = useRouter()
const { budgetIcon } = useBudgetIcon()
const { show: showOverlay } = useSuccessOverlay()

const step = ref<'choose-budget' | 'form'>('choose-budget')
const transactionType = ref<'expense' | 'income'>('expense')
const selectedBudgetId = ref('')
const chosenBudgetName = ref<string | null>(null)
const noBudget = ref(false)
const date = ref(new Date().toLocaleDateString('en-CA'))
const amount = ref('')
const note = ref('')
const appliedNoteSuggestion = ref<string | null>(null)
const noteSuggestionsOpen = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const accountId = ref<string | null>(null)

const CLOSE_AFTER_SUCCESS_MS = 1500
let closeTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  store.ensureLoaded()
  accountId.value = store.defaultExpenseAccount?.id ?? null
})

onBeforeUnmount(() => {
  if (closeTimer) {
    clearTimeout(closeTimer)
  }
})

const isIncome = computed(() => transactionType.value === 'income')
const submitLabel = computed(() => isIncome.value ? 'Submit income' : 'Submit expense')
const typePillLabel = computed(() => isIncome.value ? 'Paycheck' : (expensePillBudget.value?.name ?? chosenBudgetName.value ?? 'No budget'))
const typePillAriaLabel = computed(() =>
  isIncome.value
    ? 'Change type'
    : (expensePillBudget.value ? `Change budget from ${expensePillBudget.value.name}` : 'Choose budget')
)

const activeBudgetId = computed(() => {
  if (isIncome.value || noBudget.value) return null
  return selectedBudgetId.value || null
})

const expensePillBudget = computed(() =>
  store.budgets.find((budget: any) => budget.id === activeBudgetId.value) ?? null
)

const noteSuggestions = computed((): string[] => {
  if (!activeBudgetId.value) return []
  const query = note.value.trim().toLowerCase()
  if (!query) return []
  if (appliedNoteSuggestion.value === note.value) return []

  const seen = new Set<string>()
  const results: string[] = []
  const allHits = [...(store.budgetHits as any[]), ...(store.prevMonthBudgetHits as any[])]

  for (const hit of allHits) {
    const hitNote = hit.note?.trim()
    if (hit.budget_id === activeBudgetId.value && hitNote && hitNote.toLowerCase().includes(query) && !seen.has(hitNote)) {
      seen.add(hitNote)
      results.push(hitNote)
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

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
  transactionType.value = selection.type
  selectedBudgetId.value = selection.budgetId ?? ''
  noBudget.value = selection.noBudget
  chosenBudgetName.value = selection.budgetName
  step.value = 'form'
  accountId.value = selection.type === 'income'
    ? (store.defaultIncomeAccount?.id ?? null)
    : (store.defaultExpenseAccount?.id ?? null)
}

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

function goBack() {
  if (step.value === 'form') {
    step.value = 'choose-budget'
    return
  }

  router.back()
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

async function handleSubmit() {
  if (!isIncome.value && !noBudget.value && !selectedBudgetId.value) {
    alert('Please select a budget')
    return
  }

  if (!validateForm()) return

  try {
    loading.value = true
    error.value = null

    if (isIncome.value) {
      await store.addIncome(parseFloat(amount.value), date.value, note.value, accountId.value)
    } else {
      const budgetIdToSubmit = noBudget.value ? null : selectedBudgetId.value
      await store.addExpense(budgetIdToSubmit, date.value, amount.value, note.value, accountId.value)
    }

    await store.fetchAll()
    showOverlay()

    closeTimer = setTimeout(() => {
      navigateTo('/cashflow')
    }, CLOSE_AFTER_SUCCESS_MS)
  } catch (err: any) {
    error.value = err?.message || (isIncome.value ? 'Error recording income' : 'Error recording budget hit')
    alert(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-white dark:bg-gray-950">
    <div class="mx-auto flex h-full max-w-2xl flex-col bg-white dark:bg-gray-950">
      <div class="border-b border-gray-200 px-2 py-2 dark:border-gray-800 sm:px-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="heroicons:arrow-left"
          @click="goBack"
        >
          Back
        </UButton>
      </div>

      <div class="flex h-full min-h-0 w-full flex-col">
        <template v-if="step === 'choose-budget'">
          <div class="p-4">
            <div class="mb-5">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Add a transaction</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a budget to add an expense to it</p>
            </div>

            <BudgetsChooseBudget
              :budgets="store.budgets"
              @select="handleBudgetSelect"
            />
          </div>
        </template>

        <template v-else>
          <div class="flex h-full min-h-0 flex-col">
            <div v-if="error" class="mb-4">
              <UAlert title="Error" :description="error" color="error" variant="soft" />
            </div>

            <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <UPopover v-if="!isIncome" v-model:open="noteSuggestionsOpen">
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

                <UInput
                  v-else
                  v-model="note"
                  variant="ghost"
                  color="neutral"
                  placeholder="Enter a note...."
                  type="text"
                  size="xl"
                  class="w-full"
                  :ui="{ base: 'px-0 text-lg', trailing: 'hidden', leading: 'hidden' }"
                />
              </div>

              <AmountNumberPad v-model="amount" class="min-h-0 flex-1">
                <template #controls>
                  <div class="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                      @click="goBack"
                      :aria-label="typePillAriaLabel"
                    >
                      <div
                        v-if="isIncome"
                        class="flex size-7 shrink-0 items-center justify-center rounded-full border border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/30"
                      >
                        <UIcon name="heroicons:banknotes-solid" class="size-4 text-green-500" />
                      </div>
                      <div
                        v-else-if="expensePillBudget"
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
                      <span class="max-w-32 truncate">{{ typePillLabel }}</span>
                    </button>

                    <DateTagPicker v-model="date" />
                    <AccountTagPicker v-model="accountId" :accounts="store.accounts" />
                  </div>
                </template>

                <template #actions>
                  <UButton
                    color="primary"
                    variant="solid"
                    class="h-12 w-full justify-center text-base font-medium text-black hover:bg-green-600 dark:text-black"
                    @click="handleSubmit"
                    :disabled="loading"
                    :loading="loading"
                  >
                    {{ submitLabel }}
                  </UButton>
                </template>
              </AmountNumberPad>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

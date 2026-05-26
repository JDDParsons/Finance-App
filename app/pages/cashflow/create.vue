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

const step = ref<'choose-budget' | 'choose-entity' | 'enter-amount'>('choose-budget')
const transactionType = ref<'expense' | 'income'>('expense')
const selectedBudgetId = ref('')
const chosenBudgetName = ref<string | null>(null)
const noBudget = ref(false)
const date = ref(new Date().toLocaleDateString('en-CA'))
const amount = ref('')
const entity = ref('')
const selectedEntity = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const accountId = ref<string | null>(null)

const CLOSE_AFTER_SUCCESS_MS = 1500
let closeTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
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

const allEntitySuggestions = computed((): string[] => {
  if (!activeBudgetId.value) return []
  return store.budgetAllEntities.get(activeBudgetId.value) ?? []
})

const filteredEntitySuggestions = computed((): string[] => {
  if (selectedEntity.value) return []
  const query = entity.value.trim().toLowerCase()
  if (!query) return allEntitySuggestions.value
  return allEntitySuggestions.value.filter(s => s.toLowerCase().includes(query))
})

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
  transactionType.value = selection.type
  selectedBudgetId.value = selection.budgetId ?? ''
  noBudget.value = selection.noBudget
  chosenBudgetName.value = selection.budgetName
  entity.value = ''
  selectedEntity.value = null
  step.value = 'choose-entity'
  accountId.value = selection.type === 'income'
    ? (store.defaultIncomeAccount?.id ?? null)
    : (store.defaultExpenseAccount?.id ?? null)
  if (selection.budgetId) {
    store.fetchBudgetEntities(selection.budgetId)
  }
}

function applyEntitySuggestion(suggestion: string) {
  entity.value = suggestion
  selectedEntity.value = suggestion
}

function clearEntity() {
  entity.value = ''
  selectedEntity.value = null
}

function proceedToAmount() {
  step.value = 'enter-amount'
}

function changeBudget() {
  step.value = 'choose-budget'
}

function goBack() {
  if (step.value === 'enter-amount') {
    step.value = 'choose-entity'
    return
  }
  if (step.value === 'choose-entity') {
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
      await store.addIncome(parseFloat(amount.value), date.value, entity.value, accountId.value)
    } else {
      const budgetIdToSubmit = noBudget.value ? null : selectedBudgetId.value
      await store.addExpense(budgetIdToSubmit, date.value, amount.value, entity.value, accountId.value)
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
  <div class="bg-white dark:bg-gray-950">
    <div class="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top))] max-w-2xl flex-col bg-white dark:bg-gray-950">
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

      <div class="flex flex-1 min-h-0 w-full flex-col">
        <!-- Step 1: Choose budget -->
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

        <!-- Step 2: Choose entity -->
        <template v-else-if="step === 'choose-entity'">
          <div class="flex flex-1 flex-col p-4">
            <div class="mb-5">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ isIncome ? 'Add a Payer' : 'Add a Payee' }} <span class="text-base font-normal text-gray-400 dark:text-gray-500">(Optional)</span>
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ isIncome ? 'Who paid you?' : 'Who did you pay?' }}
              </p>
            </div>

            <!-- Pill display when an entity is selected -->
            <div
              v-if="selectedEntity"
              class="flex h-11 items-center gap-2 rounded-md border border-gray-300 px-3 dark:border-gray-700"
            >
              <span class="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
                {{ selectedEntity }}
              </span>
              <button type="button" class="ml-auto cursor-pointer" @click="clearEntity">
                <UIcon name="heroicons:x-circle" class="size-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            </div>

            <!-- Text input when no entity is selected -->
            <UInput
              v-else
              v-model="entity"
              autofocus
              variant="soft"
              color="neutral"
              :placeholder="isIncome ? 'Enter a payer...' : 'Enter a payee...'"
              type="text"
              size="xl"
              class="w-full"
            >
              <template v-if="entity" #trailing>
                <button type="button" class="cursor-pointer" @click="clearEntity">
                  <UIcon name="heroicons:x-circle" class="size-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                </button>
              </template>
            </UInput>

            <div v-if="filteredEntitySuggestions.length" class="mt-5 flex flex-wrap gap-2">
              <button
                v-for="suggestion in filteredEntitySuggestions"
                :key="suggestion"
                type="button"
                class="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 transition-colors cursor-pointer hover:border-green-300 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50"
                @click="applyEntitySuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>

            <div class="mt-auto pt-4">
              <UButton
                color="primary"
                variant="solid"
                class="h-12 w-full text-base font-semibold"
                @click="proceedToAmount"
              >
                Continue
              </UButton>
            </div>
          </div>
        </template>

        <!-- Step 3: Enter amount -->
        <template v-else>
          <div class="flex h-full min-h-0 flex-col">
            <div v-if="error" class="mb-4">
              <UAlert title="Error" :description="error" color="error" variant="soft" />
            </div>

            <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div v-if="entity" class="flex px-4 pt-3">
                <span class="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
                  {{ entity }}
                </span>
              </div>
              <AmountNumberPad v-model="amount" class="min-h-0 flex-1">
                <template #controls>
                  <div class="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                      @click="changeBudget"
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
                    class="h-12 w-full bg-gradient-to-r from-green-400 to-emerald-500 text-base font-semibold text-white shadow-lg shadow-green-500/30 transition-all duration-200 hover:from-green-500 hover:to-emerald-600 hover:shadow-green-500/50 active:scale-[0.98]"
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

<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { getBudgetErrorMessage, isDuplicateBudgetNameError, isInvalidBudgetAmountError } from '~/utils/budgetErrors'

useHead({ title: 'Add Budget | R&J Finance' })

const store = useFinanceStore()
const router = useRouter()
const route = useRoute()
const budgetType = computed<'Expense' | 'Income'>(() => route.query.type === 'income' ? 'Income' : 'Expense')
const returnQuery = computed(() => budgetType.value === 'Income' ? { type: 'income' } : {})
const { monthTitle } = useSelectedMonthTitle()
const { budgetIcon } = useBudgetIcon()

const availableLoading = ref(true)
const existingLoading = ref(false)
const existingError = ref<string | null>(null)
const selectedBudgetIds = ref<string[]>([])

const budgetName = ref('')
const amount = ref('')
const budgetColor = ref('#6366f1')
const budgetIconChoice = ref<string | null>(null)
const createLoading = ref(false)
const createError = ref<string | null>(null)
const budgetNameError = ref<string | null>(null)
const amountError = ref<string | null>(null)

const loadingLabel = computed(() => {
  if (availableLoading.value) return 'Loading existing budgets…'
  if (existingLoading.value) return 'Adding budgets…'
  if (createLoading.value) return 'Creating budget…'
  return 'Loading…'
})

const selectableBudgets = computed(() =>
  store.availableBudgets.filter((budget: any) => Number(budget.suggestedAmount) > 0)
)

onMounted(async () => {
  try {
    await store.ensureLoaded()
    await store.fetchAvailableBudgets(budgetType.value)
  } catch (error: any) {
    existingError.value = getBudgetErrorMessage(error, 'Unable to load existing budgets.')
  } finally {
    availableLoading.value = false
  }
})

watch(budgetName, () => { budgetNameError.value = null })
watch(amount, () => { amountError.value = null })

function isSelected(id: string) {
  return selectedBudgetIds.value.includes(id)
}

function toggleBudget(budget: any) {
  if (!(Number(budget.suggestedAmount) > 0) || existingLoading.value) return
  selectedBudgetIds.value = isSelected(budget.id)
    ? selectedBudgetIds.value.filter(id => id !== budget.id)
    : [...selectedBudgetIds.value, budget.id]
}

function existingPayload(ids: string[]) {
  const selected = new Set(ids)
  return store.availableBudgets
    .filter((budget: any) => selected.has(budget.id) && Number(budget.suggestedAmount) > 0)
    .map((budget: any) => ({ id: budget.id, amount: String(budget.suggestedAmount) }))
}

async function addExisting(ids: string[]) {
  const budgets = existingPayload(ids)
  if (!budgets.length) return
  try {
    existingLoading.value = true
    existingError.value = null
    await store.addExistingBudgets(budgets)
    await router.push({ path: '/budgets', query: returnQuery.value })
  } catch (error: any) {
    existingError.value = getBudgetErrorMessage(error, 'Unable to add the selected budgets.')
  } finally {
    existingLoading.value = false
  }
}

async function createBudget() {
  if (!budgetName.value.trim()) {
    budgetNameError.value = 'Please enter a budget name.'
    return
  }
  if (!(Number(amount.value) > 0)) {
    amountError.value = 'Amount must be greater than 0.'
    return
  }

  try {
    createLoading.value = true
    createError.value = null
    await store.addBudget(budgetName.value, amount.value, budgetColor.value, budgetIconChoice.value, budgetType.value)
    await router.push({ path: '/budgets', query: returnQuery.value })
  } catch (error: any) {
    if (isDuplicateBudgetNameError(error)) budgetNameError.value = 'A budget with this name already exists.'
    else if (isInvalidBudgetAmountError(error)) amountError.value = 'Amount must be greater than 0.'
    else createError.value = getBudgetErrorMessage(error, 'Unable to create this budget.')
  } finally {
    createLoading.value = false
  }
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}
</script>

<template>
  <div class="min-h-screen">
    <LoadingOverlay
      :visible="availableLoading || existingLoading || createLoading"
      :label="loadingLabel"
    />

    <AppHeader :title="`Add ${budgetType === 'Income' ? 'Income ' : ''}Budget`" />

    <UContainer class="max-w-none py-6 pb-24 lg:pb-8">
      <div class="mb-6 flex items-center gap-3">
        <UButton
          icon="heroicons-solid:arrow-left"
          color="neutral"
          variant="ghost"
          aria-label="Back to budgets"
          @click="router.push({ path: '/budgets', query: returnQuery })"
        />
        <div>
          <h1 class="text-3xl font-bold">Add {{ budgetType === 'Income' ? 'income ' : '' }}budget</h1>
          <p class="mt-1 text-sm text-gray-500">Set up {{ budgetType.toLowerCase() }} budgets for {{ monthTitle }}.</p>
        </div>
      </div>

      <div
        class="grid gap-6 lg:items-start"
        :class="availableLoading || existingError || store.availableBudgets.length > 0 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'"
      >
        <UCard v-if="availableLoading || existingError || store.availableBudgets.length > 0">
          <template #header>
            <div>
              <h2 class="text-xl font-bold">Add existing budgets to this month</h2>
              <p class="mt-1 text-sm text-gray-500">Select one or more shared budgets to reuse their latest allocations.</p>
            </div>
          </template>

          <UAlert v-if="existingError" class="mb-4" color="error" variant="soft" :description="existingError" />

          <div v-else-if="!availableLoading" class="space-y-2">
            <button
              v-for="budget in store.availableBudgets"
              :key="budget.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
              :class="isSelected(budget.id)
                ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/30'
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'"
              :disabled="existingLoading || !(Number(budget.suggestedAmount) > 0)"
              :aria-pressed="isSelected(budget.id)"
              @click="toggleBudget(budget)"
            >
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-full"
                :style="budget.color ? { backgroundColor: `${budget.color}22`, color: budget.color } : {}"
              >
                <UIcon :name="budget.icon ?? budgetIcon(budget.name)" class="size-5" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ budget.name }}</span>
                <span class="block text-sm text-gray-500">
                  {{ budget.suggestedAmount ? formatCurrency(budget.suggestedAmount) : 'No previous allocation' }}
                </span>
              </span>
              <UIcon
                :name="isSelected(budget.id) ? 'heroicons:check-circle-solid' : 'heroicons:check-circle'"
                class="size-6"
                :class="isSelected(budget.id) ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300 dark:text-gray-700'"
              />
            </button>
          </div>

          <template #footer>
            <div class="grid grid-cols-2 gap-3">
              <UButton
                color="primary"
                block
                :disabled="availableLoading || existingLoading || selectableBudgets.length === 0"
                @click="addExisting(selectableBudgets.map((budget: any) => budget.id))"
              >
                Add all
              </UButton>
              <UButton
                :variant="selectedBudgetIds.length ? 'solid' : 'soft'"
                :color="selectedBudgetIds.length ? 'secondary' : 'neutral'"
                block
                :disabled="availableLoading || existingLoading || selectedBudgetIds.length === 0"
                @click="addExisting(selectedBudgetIds)"
              >
                Add selected<span v-if="selectedBudgetIds.length"> ({{ selectedBudgetIds.length }})</span>
              </UButton>
            </div>
          </template>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="text-xl font-bold">Create a new budget</h2>
              <p class="mt-1 text-sm text-gray-500">Create a shared budget and add it to {{ monthTitle }}.</p>
            </div>
          </template>

          <div class="space-y-6">
            <UAlert v-if="createError" color="error" variant="soft" :description="createError" />
            <UFormField label="Budget name" :error="budgetNameError" required>
              <UInput v-model="budgetName" :placeholder="budgetType === 'Income' ? 'e.g., Salary' : 'e.g., Monthly Groceries'" type="text" size="xl" />
            </UFormField>
            <UFormField label="Amount" :error="amountError" required>
              <UInput v-model="amount" placeholder="0.00" type="number" step="0.01" size="xl" />
            </UFormField>
            <UFormField label="Colour"><BudgetsColorPicker v-model="budgetColor" /></UFormField>
            <UFormField label="Icon"><BudgetsChooseIcon v-model="budgetIconChoice" :color="budgetColor" /></UFormField>
          </div>

          <template #footer>
            <UButton color="primary" block size="lg" :disabled="createLoading || existingLoading" @click="createBudget">
              Create this budget
            </UButton>
          </template>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

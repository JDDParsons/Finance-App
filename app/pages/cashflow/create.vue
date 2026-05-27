<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

useHead({ title: 'Create Transaction | R&J Finance' })

const store = useFinanceStore()
const router = useRouter()
const { show: showOverlay } = useSuccessOverlay()

const step = ref<'choose-budget' | 'choose-entity' | 'add-notes' | 'enter-amount'>('choose-budget')
const STEP_ORDER = ['choose-budget', 'choose-entity', 'add-notes', 'enter-amount'] as const
const transitionDirection = ref<'forward' | 'back'>('forward')
const isStepTransitioning = ref(false)

function setStep(next: typeof step.value) {
  const from = STEP_ORDER.indexOf(step.value)
  const to = STEP_ORDER.indexOf(next)
  if (next === step.value) return
  transitionDirection.value = to >= from ? 'forward' : 'back'
  isStepTransitioning.value = true
  step.value = next
}

function finishStepTransition() {
  isStepTransitioning.value = false
}

const transactionType = ref<'expense' | 'income'>('expense')
const selectedBudgetId = ref('')
const noBudget = ref(false)
const date = ref(new Date().toLocaleDateString('en-CA'))
const amount = ref('')
const entity = ref('')
const selectedEntity = ref<string | null>(null)
const notes = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const accountId = ref<string | null>(null)

const CLOSE_AFTER_SUCCESS_MS = 1500
let closeTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  accountId.value = store.defaultExpenseAccount?.id ?? null
})

onBeforeUnmount(() => {
  if (closeTimer) clearTimeout(closeTimer)
})

const isIncome = computed(() => transactionType.value === 'income')

const activeBudgetId = computed(() => {
  if (isIncome.value || noBudget.value) return null
  return selectedBudgetId.value || null
})

const allEntitySuggestions = computed((): string[] => {
  if (!activeBudgetId.value) return []
  return store.budgetAllEntities.get(activeBudgetId.value) ?? []
})

function handleBudgetSelect(selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }) {
  transactionType.value = selection.type
  selectedBudgetId.value = selection.budgetId ?? ''
  noBudget.value = selection.noBudget
  entity.value = ''
  selectedEntity.value = null
  notes.value = ''
  accountId.value = selection.type === 'income'
    ? (store.defaultIncomeAccount?.id ?? null)
    : (store.defaultExpenseAccount?.id ?? null)
  if (selection.budgetId && !store.budgetAllEntities.has(selection.budgetId)) {
    store.fetchBudgetEntities(selection.budgetId)
  }
  setStep('choose-entity')
}

function goBack() {
  if (step.value === 'enter-amount') { setStep('add-notes'); return }
  if (step.value === 'add-notes') { setStep('choose-entity'); return }
  if (step.value === 'choose-entity') { setStep('choose-budget'); return }
  router.back()
}

async function handleSubmit() {
  if (!isIncome.value && !noBudget.value && !selectedBudgetId.value) {
    alert('Please select a budget')
    return
  }
  if (!date.value) { alert('Please select a date'); return }
  if (!amount.value) { alert('Please enter an amount'); return }

  try {
    loading.value = true
    error.value = null

    if (isIncome.value) {
      await store.addIncome(parseFloat(amount.value), date.value, entity.value, accountId.value, notes.value)
    } else {
      const budgetIdToSubmit = noBudget.value ? null : selectedBudgetId.value
      await store.addExpense(budgetIdToSubmit, date.value, amount.value, entity.value, accountId.value, notes.value)
    }

    await store.fetchAll()
    showOverlay()
    closeTimer = setTimeout(() => navigateTo('/cashflow'), CLOSE_AFTER_SUCCESS_MS)
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
      <div class="border-b-4 bg-blue-50 border-b-blue-200 dark:bg-blue-900/10 dark:border-b-blue-900 px-2 py-2 sm:px-4">
        <UButton
          color="secondary"
          variant="soft"
          icon="heroicons:arrow-left"
          aria-label="Back"
          @click="goBack"
        >
        </UButton>
        
      </div>

      <div class="relative flex-1 min-h-0 overflow-hidden">
        <Transition
          :name="transitionDirection === 'forward' ? 'slide-forward' : 'slide-back'"
          @after-enter="finishStepTransition"
          @enter-cancelled="finishStepTransition"
        >
          <CashflowCreateStepBudget
            v-if="step === 'choose-budget'"
            key="choose-budget"
            @select="handleBudgetSelect"
          />
          <CashflowCreateStepEntity
            v-else-if="step === 'choose-entity'"
            key="choose-entity"
            v-model:entity="entity"
            v-model:selected-entity="selectedEntity"
            :is-income="isIncome"
            :suggestions="allEntitySuggestions"
            :should-autofocus="!isStepTransitioning"
            @continue="setStep('add-notes')"
          />
          <CashflowCreateStepNotes
            v-else-if="step === 'add-notes'"
            key="add-notes"
            v-model="notes"
            :should-autofocus="!isStepTransitioning"
            @continue="setStep('enter-amount')"
          />
          <CashflowCreateStepAmount
            v-else
            key="enter-amount"
            v-model:amount="amount"
            v-model:date="date"
            v-model:account-id="accountId"
            :entity="entity"
            :transaction-type="transactionType"
            :selected-budget-id="selectedBudgetId"
            :no-budget="noBudget"
            :loading="loading"
            :error="error"
            @change-budget="setStep('choose-budget')"
            @submit="handleSubmit"
          />
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-back-enter-active,
.slide-back-leave-active {
  transition:
    transform 280ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 220ms ease;
  will-change: transform, opacity;
}

.slide-forward-enter-from,
.slide-forward-leave-to,
.slide-back-enter-from,
.slide-back-leave-to {
  opacity: 0;
}

.slide-forward-enter-to,
.slide-forward-leave-from,
.slide-back-enter-to,
.slide-back-leave-from {
  opacity: 1;
}

.slide-forward-leave-active,
.slide-back-leave-active {
  pointer-events: none;
}

.slide-forward-enter-from { transform: translate3d(3rem, 0, 0); }
.slide-forward-leave-to   { transform: translate3d(-3rem, 0, 0); }
.slide-back-enter-from    { transform: translate3d(-3rem, 0, 0); }
.slide-back-leave-to      { transform: translate3d(3rem, 0, 0); }
</style>

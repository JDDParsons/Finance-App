<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useTransactionViewStore } from '~/stores/transactionView'

const store = useFinanceStore()
const transactionView = useTransactionViewStore()
const transactionType = computed({
  get: () => transactionView.selectedType,
  set: type => transactionView.selectType(type),
})
const visibleBudgets = computed(() => transactionType.value === 'income' ? store.incomeBudgets : store.budgets)
const fromAccountId = ref<string | undefined>()
const toAccountId = ref<string | undefined>()
const canContinueTransfer = computed(() =>
  !!fromAccountId.value && !!toAccountId.value && fromAccountId.value !== toAccountId.value
)

const emit = defineEmits<{
  select: [selection: { budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }]
  selectTransfer: [selection: { fromAccountId: string; toAccountId: string }]
}>()

function continueTransfer() {
  if (!canContinueTransfer.value || !fromAccountId.value || !toAccountId.value) return
  emit('selectTransfer', { fromAccountId: fromAccountId.value, toAccountId: toAccountId.value })
}
</script>

<template>
  <div class="absolute inset-0 flex flex-col">
    <div class="shrink-0 px-4 pt-4 pb-0">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Add a transaction</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a transaction type</p>
      <div class="mt-4 grid grid-cols-3 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <UButton :variant="transactionType === 'expense' ? 'solid' : 'ghost'" block @click="transactionType = 'expense'">Expense</UButton>
        <UButton :variant="transactionType === 'income' ? 'solid' : 'ghost'" block @click="transactionType = 'income'">Income</UButton>
        <UButton :variant="transactionType === 'transfer' ? 'solid' : 'ghost'" block @click="transactionType = 'transfer'">Transfer</UButton>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <div v-if="transactionType === 'transfer'" class="mx-auto flex max-w-md flex-col gap-5 pt-2">
        <UAlert
          v-if="store.accounts.length < 2"
          color="warning"
          title="Two accounts required"
          description="Add at least two accounts before recording a transfer."
        />
        <template v-else>
          <UFormField label="Transfer from" required>
            <AccountSelect v-model="fromAccountId" :accounts="store.accounts" placeholder="Choose source account" />
          </UFormField>
          <div class="flex justify-center text-gray-400">
            <UIcon name="heroicons:arrow-down" class="size-6" />
          </div>
          <UFormField label="Transfer to" required>
            <AccountSelect v-model="toAccountId" :accounts="store.accounts" placeholder="Choose destination account" />
          </UFormField>
          <UAlert
            v-if="fromAccountId && fromAccountId === toAccountId"
            color="error"
            description="Source and destination accounts must be different."
          />
          <UButton size="xl" block :disabled="!canContinueTransfer" @click="continueTransfer">
            Continue
          </UButton>
        </template>
      </div>
      <BudgetsChooseBudget v-else :budgets="visibleBudgets" :type="transactionType" @select="emit('select', $event)" />
    </div>
  </div>
</template>

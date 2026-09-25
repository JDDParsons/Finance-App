<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useTransactionViewStore } from '~/stores/transactionView'

useHead({ title: 'Budgets | R&J Finance' })

const store = useFinanceStore()
const transactionView = useTransactionViewStore()
const router = useRouter()
const route = useRoute()
const loading = computed(() => store.loading)
const error = computed(() => store.error)

const selectedType = computed<'Expense' | 'Income'>(() => transactionView.selectedType === 'income' ? 'Income' : 'Expense')
const displayBudgets = computed(() =>
  [...(selectedType.value === 'Income' ? store.incomeBudgets : store.budgets)]
    .sort((a: any, b: any) => (b.currentPeriod?.amount || 0) - (a.currentPeriod?.amount || 0))
)
const desktopBudgets = computed(() => [...store.budgets, ...store.incomeBudgets])
const plannedIncome = computed(() => store.incomeBudgets.reduce((sum, b) => sum + (Number(b.currentPeriod?.amount) || 0), 0))
const receivedIncome = computed(() => store.income.reduce((sum, row) => sum + (Number(row.amount) || 0), 0))
const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function selectType(type: 'Expense' | 'Income') {
  transactionView.selectType(type === 'Income' ? 'income' : 'expense')
  router.replace({ path: '/budgets', query: type === 'Income' ? { type: 'income' } : {} })
}

function openBudget(budgetId: string, budgetType: 'Expense' | 'Income' = selectedType.value) {
  router.push({ path: `/budgets/${budgetId}`, query: budgetType === 'Income' ? { type: 'income' } : {} })
}

function addBudget(budgetType: 'Expense' | 'Income' = selectedType.value) {
  router.push({ path: '/budgets/create', query: budgetType === 'Income' ? { type: 'income' } : {} })
}

watch(
  () => route.query.type,
  type => {
    if (type === 'income' || type === 'expense') {
      transactionView.selectType(type)
    } else if (transactionView.selectedType === 'income') {
      router.replace({ path: '/budgets', query: { type: 'income' } })
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen">
    <AppHeader title="Budgets" />

    <UContainer class="max-w-none lg:px-0">
      <div class="mt-4 mb-2 lg:hidden">
        <div class="mb-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <UButton :variant="selectedType === 'Expense' ? 'solid' : 'ghost'" block @click="selectType('Expense')">Expenses</UButton>
          <UButton :variant="selectedType === 'Income' ? 'solid' : 'ghost'" block @click="selectType('Income')">Income</UButton>
        </div>
        <BudgetsAllocationGaugeBar v-if="selectedType === 'Expense'" />
        <div v-else class="grid grid-cols-3 gap-3 rounded-2xl border border-gray-200 p-4 text-center dark:border-gray-800">
          <div><p class="text-xs text-gray-500">Planned</p><p class="font-semibold">{{ formatCurrency(plannedIncome) }}</p></div>
          <div><p class="text-xs text-gray-500">Received</p><p class="font-semibold text-green-600">{{ formatCurrency(receivedIncome) }}</p></div>
          <div><p class="text-xs text-gray-500">{{ receivedIncome > plannedIncome ? 'Above target' : 'Still expected' }}</p><p class="font-semibold">{{ formatCurrency(Math.abs(plannedIncome - receivedIncome)) }}</p></div>
        </div>
      </div>

      <UAlert v-if="error" class="mb-4" title="Error" :description="error" color="error" variant="soft" />

      <div v-if="loading" class="py-12 text-center">
        <p class="text-gray-400">Loading budgets...</p>
      </div>

      <template v-else>
        <div class="grid grid-cols-3 gap-3 pb-24 sm:grid-cols-3 lg:hidden">
          <BudgetsBudgetCard
            v-for="budget in displayBudgets"
            :key="budget.id"
            :budget="budget"
            @select="openBudget"
          />
          <BudgetsAddBudgetCard @select="addBudget" />
        </div>

        <div class="hidden pb-6 lg:block">
          <BudgetsTable :budgets="desktopBudgets" @select="openBudget" @add="addBudget" />
        </div>
      </template>
    </UContainer>
  </div>
</template>

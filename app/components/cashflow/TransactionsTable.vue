<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'

type TransactionType = 'expense' | 'income'

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const budgetMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.name]))
)

const budgetColorMap = computed(() =>
  new Map<string, string | null>(store.budgets.map((b: any) => [b.id, b.color ?? null]))
)

const budgetIconMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.icon ?? budgetIcon(b.name)]))
)

const accountMap = computed(() =>
  new Map<string, string>(store.accounts.map((a: any) => [a.id, a.name || a.institution || 'Account']))
)

// Combine expenses and income into one sorted, tagged list
const transactions = computed(() => {
  const expenseRows = store.budgetHits.map((hit: any) => ({
    ...hit,
    type: 'expense' as TransactionType,
  }))
  const incomeRows = store.income.map((row: any) => ({
    ...row,
    type: 'income' as TransactionType,
  }))

  return [...expenseRows, ...incomeRows].sort((a: any, b: any) => {
    const da = (a.date ?? '').slice(0, 10)
    const db = (b.date ?? '').slice(0, 10)
    return da < db ? 1 : da > db ? -1 : 0
  })
})

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const tableColumns = [
  { accessorKey: 'date',   header: 'Date',   id: 'date'   },
  { accessorKey: 'type',   header: 'Type',   id: 'type'   },
  { accessorKey: 'amount', header: 'Amount', id: 'amount' },
  { accessorKey: 'entity', header: 'Payee',  id: 'entity' },
  { accessorKey: 'budget', header: 'Budget', id: 'budget' },
  { accessorKey: 'account',header: 'Account',id: 'account'},
  { accessorKey: 'notes',  header: 'Notes',  id: 'notes'  },
  { id: 'actions', header: '' },
]

const selectedTransaction = ref<any>(null)
const isEditingTransaction = ref(false)

function handleRowClick(row: any) {
  selectedTransaction.value = row
  isEditingTransaction.value = true
}

function handleEditClose() {
  isEditingTransaction.value = false
  selectedTransaction.value = null
}

async function handleDelete(row: any) {
  const label = row.type === 'income' ? 'income record' : 'expense'
  if (!confirm(`Are you sure you want to delete this ${label}? This action cannot be undone.`)) return
  try {
    if (row.type === 'income') {
      await store.removeIncome(row.id)
    } else {
      await store.removeExpense(row.id)
    }
  } catch (err: any) {
    alert(err?.message || `Failed to delete ${label}`)
  }
}

async function handleModalDelete() {
  if (!selectedTransaction.value) return
  await handleDelete(selectedTransaction.value)
  handleEditClose()
}
</script>

<template>
  <div class="w-full">
    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="transactions.length === 0" class="text-center text-gray-400 py-16">
      No transactions recorded for this month.
    </div>

    <UTable
      v-else
      :data="transactions"
      :columns="tableColumns"
      class="cursor-pointer"
      @select="(_e: Event, row: any) => handleRowClick(row.original)"
    >
      <template #date-cell="{ row }">{{ formatDate(row.original.date) }}</template>

      <template #type-cell="{ row }">
        <UBadge
          :color="row.original.type === 'income' ? 'success' : 'warning'"
          variant="subtle"
        >
          {{ row.original.type === 'income' ? 'Income' : 'Expense' }}
        </UBadge>
      </template>

      <template #amount-cell="{ row }">{{ formatCurrency(row.original.amount) }}</template>

      <template #entity-cell="{ row }">{{ row.original.entity || '-' }}</template>

      <template #budget-cell="{ row }">
        <div v-if="row.original.type === 'expense' && row.original.budget_id" class="flex items-center gap-1.5">
          <div
            class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            :style="budgetColorMap.get(row.original.budget_id) ? { backgroundColor: budgetColorMap.get(row.original.budget_id) + '33' } : {}"
          >
            <UIcon
              :name="budgetIconMap.get(row.original.budget_id) ?? 'heroicons:wallet-solid'"
              class="size-3"
              :style="budgetColorMap.get(row.original.budget_id) ? { color: budgetColorMap.get(row.original.budget_id) } : {}"
            />
          </div>
          <span>{{ budgetMap.get(row.original.budget_id) ?? '-' }}</span>
        </div>
        <span v-else class="text-gray-400">—</span>
      </template>

      <template #account-cell="{ row }">
        {{ row.original.account_id ? accountMap.get(row.original.account_id) ?? '-' : '-' }}
      </template>

      <template #notes-cell="{ row }">
        <span
          v-if="row.original.notes"
          class="block max-w-[200px] truncate text-gray-500 dark:text-gray-400"
          :title="row.original.notes"
        >
          {{ row.original.notes }}
        </span>
        <span v-else class="text-gray-400">—</span>
      </template>

      <template #actions-cell="{ row }">
        <UButton
          icon="heroicons-solid:trash"
          color="error"
          variant="ghost"
          size="xs"
          @click.stop="handleDelete(row.original)"
        />
      </template>
    </UTable>

    <UModal v-if="selectedTransaction" v-model:open="isEditingTransaction" @update:open="(val) => { if (!val) handleEditClose() }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold">
                {{ selectedTransaction.type === 'income' ? 'Edit Income' : 'Edit Expense' }}
              </h2>
              <UButton
                icon="heroicons-solid:trash"
                color="error"
                variant="ghost"
                size="sm"
                @click="handleModalDelete"
              />
            </div>
          </template>

          <ExpenseEdit
            v-if="selectedTransaction.type === 'expense'"
            :expense-id="selectedTransaction.id"
            :expense-amount="selectedTransaction.amount"
            :expense-date="selectedTransaction.date"
            :expense-entity="selectedTransaction.entity"
            :expense-notes="selectedTransaction.notes"
            :expense-budget-id="selectedTransaction.budget_id"
            :expense-account-id="selectedTransaction.account_id ?? null"
            @update="handleEditClose"
            @cancel="handleEditClose"
            @delete="handleEditClose"
          />
          <IncomeEdit
            v-else
            :income-id="selectedTransaction.id"
            :income-amount="selectedTransaction.amount"
            :income-date="selectedTransaction.date"
            :income-entity="selectedTransaction.entity"
            :income-account-id="selectedTransaction.account_id ?? null"
            @update="handleEditClose"
            @cancel="handleEditClose"
            @delete="handleEditClose"
          />
        </UCard>
      </template>
    </UModal>
  </div>
</template>

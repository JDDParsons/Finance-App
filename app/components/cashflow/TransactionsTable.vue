<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'

type TransactionType = 'expense' | 'income'

type TransactionRow = {
  id: string
  date: string | null
  type: TransactionType
  amount: number | null
  entity?: string | null
  budget_id?: string | null
  account_id?: string | null
  notes?: string | null
  kind: 'transaction'
  [key: string]: any
}

type DateGroupRow = {
  id: string
  kind: 'date-group'
  date: string
  subRows: TransactionRow[]
}

type TableRow = TransactionRow | DateGroupRow

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const budgetMap = computed(() =>
  new Map<string, string>([...store.budgets, ...store.incomeBudgets].map((b: any) => [b.id, b.name]))
)

const budgetColorMap = computed(() =>
  new Map<string, string | null>([...store.budgets, ...store.incomeBudgets].map((b: any) => [b.id, b.color ?? null]))
)

const budgetIconMap = computed(() =>
  new Map<string, string>([...store.budgets, ...store.incomeBudgets].map((b: any) => [b.id, b.icon ?? budgetIcon(b.name)]))
)

const accountMap = computed(() =>
  new Map<string, string>(store.accounts.map((a: any) => [a.id, a.name || a.institution || 'Account']))
)

// Combine expenses and income into one sorted, tagged list
const transactions = computed(() => {
  const expenseRows = store.budgetHits.map((hit: any) => ({
    ...hit,
    type: 'expense' as TransactionType,
    kind: 'transaction' as const,
  }))
  const incomeRows = store.income.map((row: any) => ({
    ...row,
    type: 'income' as TransactionType,
    kind: 'transaction' as const,
  }))

  return [...expenseRows, ...incomeRows].sort((a: any, b: any) => {
    const da = (a.date ?? '').slice(0, 10)
    const db = (b.date ?? '').slice(0, 10)
    return da < db ? 1 : da > db ? -1 : 0
  })
})

const groupedTransactions = computed<DateGroupRow[]>(() => {
  const groups = new Map<string, TransactionRow[]>()

  for (const transaction of transactions.value) {
    const date = (transaction.date ?? '').slice(0, 10)
    const rows = groups.get(date) ?? []
    rows.push(transaction)
    groups.set(date, rows)
  }

  return Array.from(groups, ([date, subRows]) => ({
    id: `date-${date || 'unknown'}`,
    kind: 'date-group' as const,
    date,
    subRows,
  }))
})

const collapsedDates = ref(new Set<string>())

const tableRows = computed<TableRow[]>(() =>
  groupedTransactions.value.flatMap(group => [
    group,
    ...(collapsedDates.value.has(group.date) ? [] : group.subRows),
  ])
)

function isDateGroup(row: TableRow): row is DateGroupRow {
  return row.kind === 'date-group'
}

function isDateExpanded(date: string) {
  return !collapsedDates.value.has(date)
}

function toggleDate(date: string) {
  const next = new Set(collapsedDates.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  collapsedDates.value = next
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const tableColumns = [
  {
    accessorKey: 'amount',
    header: 'Amount',
    id: 'amount',
    meta: {
      style: {
        td: (cell: any) => {
          const row = cell.row.original as TableRow
          if (isDateGroup(row)) return { borderLeft: '4px solid #4b5563' }
          if (row.type === 'income') return { borderLeft: '4px solid #86efac' }
          if (!row.budget_id) return {}

          const color = budgetColorMap.value.get(row.budget_id)
          return color ? { borderLeft: `4px solid ${color}` } : {}
        },
      },
    },
  },
  { accessorKey: 'type',   header: 'Type',   id: 'type'   },
  { accessorKey: 'budget', header: 'Budget', id: 'budget' },
  { accessorKey: 'entity', header: 'Payer/Payee', id: 'entity' },
  { accessorKey: 'notes',  header: 'Notes',  id: 'notes'  },
  { accessorKey: 'account',header: 'Account',id: 'account'},
]

const selectedTransaction = ref<any>(null)
const isEditingTransaction = ref(false)

function handleRowClick(row: any) {
  if (isDateGroup(row.original)) {
    toggleDate(row.original.date)
    return
  }

  selectedTransaction.value = row.original
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
  <div class="w-full pr-4 sm:pr-6">
    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="transactions.length === 0" class="text-center text-gray-400 py-16">
      No transactions recorded for this month.
    </div>

    <UTable
      v-else
      :data="tableRows"
      :columns="tableColumns"
      :get-row-id="(row: TableRow) => isDateGroup(row) ? row.id : `${row.type}-${row.id}`"
      :meta="{
        class: {
          tr: (row: any) => isDateGroup(row.original)
            ? 'bg-gray-100/80 dark:bg-gray-800/70 hover:bg-gray-200/80 dark:hover:bg-gray-800'
            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
      }"
      :ui="{ td: 'py-2', th: 'py-2.5' }"
      class="cursor-pointer"
      @select="(_e: Event, row: any) => handleRowClick(row)"
    >
      <template #amount-cell="{ row }">
        <div v-if="isDateGroup(row.original)" class="flex items-center w-30 gap-2 font-semibold text-sm whitespace-nowrap">
          <span>{{ formatDate(row.original.date) }}</span>
          <UButton
            :icon="isDateExpanded(row.original.date) ? 'heroicons:chevron-down-20-solid' : 'heroicons:chevron-right-20-solid'"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="isDateExpanded(row.original.date) ? 'Collapse date' : 'Expand date'"
            @click.stop="toggleDate(row.original.date)"
          />
        </div>
        <span v-else>
          {{ formatCurrency(row.original.amount) }}
        </span>
      </template>

      <template #type-cell="{ row }">
        <span v-if="isDateGroup(row.original)" class="text-sm text-gray-500 dark:text-gray-400">
        </span>
        <UBadge
          v-else
          :color="row.original.type === 'income' ? 'success' : 'warning'"
          variant="subtle"
        >
          {{ row.original.type === 'income' ? 'Income' : 'Expense' }}
        </UBadge>
      </template>

      <template #entity-cell="{ row }">
        <span v-if="!isDateGroup(row.original)">{{ row.original.entity || '-' }}</span>
      </template>

      <template #budget-cell="{ row }">
        <div v-if="!isDateGroup(row.original) && row.original.budget_id" class="flex items-center gap-1.5">
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
        <span v-else-if="!isDateGroup(row.original)" class="text-gray-400">—</span>
      </template>

      <template #account-cell="{ row }">
        <template v-if="!isDateGroup(row.original)">
          {{ row.original.account_id ? accountMap.get(row.original.account_id) ?? '-' : '-' }}
        </template>
      </template>

      <template #notes-cell="{ row }">
        <span
          v-if="!isDateGroup(row.original) && row.original.notes"
          class="block max-w-[200px] truncate text-gray-500 dark:text-gray-400"
          :title="row.original.notes"
        >
          {{ row.original.notes }}
        </span>
        <span v-else-if="!isDateGroup(row.original)" class="text-gray-400">—</span>
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
            :income-budget-id="selectedTransaction.budget_id ?? null"
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

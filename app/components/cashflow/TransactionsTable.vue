<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import { accountDisplayName } from '../../../utils/accountAppearance'
import { datesInMonth } from '../../../utils/cashflowDates'

type TransactionType = 'expense' | 'income' | 'transfer'

type TransactionRow = {
  id: string
  date: string | null
  type: TransactionType
  amount: number | null
  entity?: string | null
  budget_id?: string | null
  account_id?: string | null
  destination_account_id?: string | null
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
const transactionModal = useTransactionCreateModalStore()
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
  new Map<string, any>(store.accounts.map((a: any) => [a.id, a]))
)

function accountName(id: string | null | undefined) {
  const account = id ? accountMap.value.get(id) : null
  return accountDisplayName(account, 'Unknown')
}

// Combine expenses, income, and transfers into one sorted, tagged list
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
  const transferRows = store.transfers.map((row: any) => ({
    ...row,
    type: 'transfer' as TransactionType,
    kind: 'transaction' as const,
  }))

  return [...expenseRows, ...incomeRows, ...transferRows].sort((a: any, b: any) => {
    const da = (a.date ?? '').slice(0, 10)
    const db = (b.date ?? '').slice(0, 10)
    return da < db ? 1 : da > db ? -1 : 0
  })
})

const groupedTransactions = computed<DateGroupRow[]>(() => {
  const groups = new Map<string, TransactionRow[]>(
    datesInMonth(store.selectedMonth).map(date => [date, []])
  )

  for (const transaction of transactions.value) {
    const date = (transaction.date ?? '').slice(0, 10)
    if (!groups.has(date)) continue
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

const tableRows = computed<TableRow[]>(() =>
  groupedTransactions.value.flatMap(group => [group, ...group.subRows])
)

function isDateGroup(row: TableRow): row is DateGroupRow {
  return row.kind === 'date-group'
}

function addTransactionForDate(date: string) {
  transactionModal.open(date)
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
  { accessorKey: 'entity', header: '', id: 'entity' },
  { accessorKey: 'amount', header: 'Amount', id: 'amount' },
  { accessorKey: 'notes',  header: 'Notes',  id: 'notes'  },
  { accessorKey: 'type',   header: 'Type',   id: 'type'   },
  { accessorKey: 'budget', header: 'Budget', id: 'budget' },
  { accessorKey: 'account',header: 'Account',id: 'account'},
  { accessorKey: 'actions', header: '', id: 'actions' },
]

const selectedTransaction = ref<any>(null)
const isEditingTransaction = ref(false)
const hoveredDate = ref<string | null>(null)

function rowDate(row: TableRow) {
  return isDateGroup(row) ? row.date : (row.date ?? '').slice(0, 10)
}

function weekKey(row: TableRow) {
  const date = new Date(`${rowDate(row)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - date.getUTCDay())
  return date.toISOString().slice(0, 10)
}

function weekRailPosition(row: TableRow, index: number) {
  const key = weekKey(row)
  return {
    starts: index === 0 || weekKey(tableRows.value[index - 1]!) !== key,
    ends: index === tableRows.value.length - 1 || weekKey(tableRows.value[index + 1]!) !== key,
  }
}

function handleTableHover(event: MouseEvent) {
  const target = event.target as HTMLElement
  const rowElement = target.closest('tbody tr')
  const body = rowElement?.parentElement
  if (!rowElement || !body) return

  const index = Array.from(body.children).indexOf(rowElement)
  const row = tableRows.value[index]
  hoveredDate.value = row ? rowDate(row) : null
}

function editTransaction(transaction: TransactionRow) {
  selectedTransaction.value = transaction
  isEditingTransaction.value = true
}

function handleEditClose() {
  isEditingTransaction.value = false
  selectedTransaction.value = null
}

async function handleDelete(row: any) {
  const label = row.type === 'income' ? 'income record' : row.type === 'transfer' ? 'transfer' : 'expense'
  if (!confirm(`Are you sure you want to delete this ${label}? This action cannot be undone.`)) return
  try {
    if (row.type === 'income') {
      await store.removeIncome(row.id)
    } else if (row.type === 'transfer') {
      await store.removeTransfer(row.id)
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

    <UTable
      v-else
      :data="tableRows"
      :columns="tableColumns"
      :get-row-id="(row: TableRow) => isDateGroup(row) ? row.id : `${row.type}-${row.id}`"
      :meta="{
        class: {
          tr: (row: any) => {
            const original = row.original as TableRow
            const isHovered = hoveredDate === rowDate(original)
            const isFirstDate = isDateGroup(original)
              && original.date === groupedTransactions[0]?.date
            const rail = weekRailPosition(original, row.index)
            return [
              'cursor-default',
              'cashflow-week-rail',
              rail.starts ? 'cashflow-week-rail-start' : '',
              rail.ends ? 'cashflow-week-rail-end' : '',
              isDateGroup(original) && !isFirstDate
                ? 'border-x-0 border-b-0 border-t border-dotted'
                : 'border-0',
              isHovered ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'
            ].join(' ')
          }
        }
      }"
      :ui="{ td: 'py-2', th: 'py-2.5', separator: 'hidden' }"
      class="cashflow-table"
      @mouseover="handleTableHover"
      @mouseleave="hoveredDate = null"
    >
      <template #entity-cell="{ row }">
        <div v-if="isDateGroup(row.original)" class="cashflow-date -ml-2 flex w-30 items-center gap-2 whitespace-nowrap text-sm italic text-gray-400 dark:text-gray-500">
          <UBadge color="neutral" variant="subtle">
            {{ formatDate(row.original.date) }}
          </UBadge>
          <UButton
            icon="heroicons:plus-20-solid"
            color="primary"
            variant="soft"
            size="xs"
            class="cursor-pointer"
            :aria-label="`Add transaction for ${formatDate(row.original.date)}`"
            @click.stop="addTransactionForDate(row.original.date)"
          />
        </div>
        <span v-else class="inline-flex items-center gap-2">
          <UIcon
            :name="row.original.type === 'expense'
              ? 'heroicons:arrow-down-20-solid'
              : row.original.type === 'income'
                ? 'heroicons:arrow-up-20-solid'
                : 'heroicons:arrows-right-left-20-solid'"
            :class="row.original.type === 'expense'
              ? 'size-4 shrink-0 text-yellow-500'
              : row.original.type === 'income'
                ? 'size-4 shrink-0 text-green-500'
                : 'size-4 shrink-0 text-blue-500'"
            aria-hidden="true"
          />
          {{ row.original.entity || '—' }}
        </span>
      </template>

      <template #amount-cell="{ row }">
        <span v-if="!isDateGroup(row.original)">{{ formatCurrency(row.original.amount) }}</span>
      </template>

      <template #type-cell="{ row }">
        <span v-if="isDateGroup(row.original)" class="text-sm text-gray-500 dark:text-gray-400">
        </span>
        <UBadge
          v-else
          :color="row.original.type === 'income' ? 'success' : row.original.type === 'transfer' ? 'info' : 'warning'"
          variant="subtle"
        >
          {{ row.original.type === 'income' ? 'Income' : row.original.type === 'transfer' ? 'Transfer' : 'Expense' }}
        </UBadge>
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
          <span v-if="row.original.type === 'transfer'" class="inline-flex items-center gap-1">
            <AccountVisual :account="accountMap.get(row.original.account_id!)" size="sm" />
            {{ accountName(row.original.account_id) }}
            <UIcon name="heroicons:arrow-right" class="size-4 text-gray-400" />
            <AccountVisual :account="accountMap.get(row.original.destination_account_id!)" size="sm" />
            {{ accountName(row.original.destination_account_id) }}
          </span>
          <template v-else>
            <span v-if="row.original.account_id" class="inline-flex items-center gap-1">
              <AccountVisual :account="accountMap.get(row.original.account_id)" size="sm" />
              {{ accountName(row.original.account_id) }}
            </span>
            <span v-else>-</span>
          </template>
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

      <template #actions-cell="{ row }">
        <UButton
          v-if="!isDateGroup(row.original)"
          icon="heroicons:pencil-square-20-solid"
          color="neutral"
          variant="ghost"
          size="xs"
          class="cursor-pointer"
          :aria-label="`Edit ${row.original.type} transaction`"
          @click.stop="editTransaction(row.original)"
        />
      </template>

    </UTable>

    <UModal v-if="selectedTransaction" v-model:open="isEditingTransaction" @update:open="(val) => { if (!val) handleEditClose() }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold">
                {{ selectedTransaction.type === 'income' ? 'Edit Income' : selectedTransaction.type === 'transfer' ? 'Edit Transfer' : 'Edit Expense' }}
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
            v-else-if="selectedTransaction.type === 'income'"
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
          <TransferEdit
            v-else
            :transfer-id="selectedTransaction.id"
            :transfer-amount="selectedTransaction.amount"
            :transfer-date="selectedTransaction.date"
            :from-account-id="selectedTransaction.account_id"
            :to-account-id="selectedTransaction.destination_account_id"
            @update="handleEditClose"
            @cancel="handleEditClose"
          />
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.cashflow-table :deep(th),
.cashflow-date {
  font-family: "Georgia", serif;
}

.cashflow-table :deep(.cashflow-week-rail > td:first-child) {
  position: relative;
}

.cashflow-table :deep(.cashflow-week-rail > td:first-child::before) {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0.25rem;
  border-left: 1px solid var(--ui-border-accented);
  content: "";
}

.cashflow-table :deep(.cashflow-week-rail-start > td:first-child::before) {
  top: 50%;
}

.cashflow-table :deep(.cashflow-week-rail-end > td:first-child::before) {
  bottom: 50%;
}

</style>

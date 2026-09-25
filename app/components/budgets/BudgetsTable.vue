<script setup lang="ts">
import { useBudgetIcon } from '~/composables/useBudgetIcon'

interface BudgetTableBudget {
  id: string
  name: string
  color?: string | null
  icon?: string | null
  currentPeriod?: {
    amount?: number | null
  } | null
  totalHitAmount?: number | null
  type?: 'Expense' | 'Income'
}

type BudgetRow = BudgetTableBudget & { kind: 'budget' }

interface BudgetGroupRow {
  id: string
  kind: 'group'
  name: string
}

interface AddBudgetRow {
  id: string
  kind: 'add'
  name: string
  type: 'Expense' | 'Income'
}

type TableRow = BudgetRow | BudgetGroupRow | AddBudgetRow

const props = defineProps<{
  budgets: BudgetTableBudget[]
}>()

const emit = defineEmits<{
  select: [budgetId: string, budgetType: 'Expense' | 'Income']
  add: [budgetType: 'Expense' | 'Income']
}>()

const { budgetIcon } = useBudgetIcon()

const tableRows = computed<TableRow[]>(() => {
  const groups: Array<{ type: 'Expense' | 'Income'; label: string }> = [
    { type: 'Expense', label: 'Expense budgets' },
    { type: 'Income', label: 'Income budgets' },
  ]

  return groups.flatMap((group) => {
    const budgets = props.budgets
      .filter(budget => (budget.type ?? 'Expense') === group.type)
      .sort((a, b) => budgetAmount(b) - budgetAmount(a))
      .map(budget => ({ ...budget, kind: 'budget' as const }))

    return [
      { id: `group-${group.type.toLowerCase()}`, kind: 'group' as const, name: group.label },
      ...budgets,
      {
        id: `add-${group.type.toLowerCase()}`,
        kind: 'add' as const,
        name: `Add ${group.type.toLowerCase()} budget`,
        type: group.type,
      },
    ]
  })
})

const columns = [
  { accessorKey: 'name', header: 'Budget', id: 'name' },
  { accessorKey: 'amount', header: 'Amount', id: 'amount' },
  { accessorKey: 'progress', header: 'Progress', id: 'progress' },
]

function budgetAmount(budget: BudgetTableBudget) {
  return Number(budget.currentPeriod?.amount) || 0
}

function progressAmount(budget: BudgetTableBudget) {
  return Number(budget.totalHitAmount) || 0
}

function accentColor(budget: BudgetTableBudget) {
  return budget.color || '#34d399'
}

function isGroup(row: TableRow): row is BudgetGroupRow {
  return row.kind === 'group'
}

function isAddRow(row: TableRow): row is AddBudgetRow {
  return row.kind === 'add'
}

function rowStyle(row: TableRow) {
  if (isGroup(row) || isAddRow(row)) return {}
  const budget = row
  const color = accentColor(budget)
  return {
    backgroundColor: `${color}14`,
    boxShadow: `inset 4px 0 0 ${color}`,
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function selectBudget(_event: Event, row: { original: TableRow }) {
  if (isGroup(row.original)) return
  if (isAddRow(row.original)) {
    emit('add', row.original.type)
    return
  }
  emit('select', row.original.id, row.original.type ?? 'Expense')
}
</script>

<template>
  <UTable
    :data="tableRows"
    :columns="columns"
    :get-row-id="(row: TableRow) => row.id"
    :meta="{
      class: {
        tr: (row: any) => isGroup(row.original as TableRow)
          ? 'cursor-default border-t border-solid border-t-black bg-gray-100 shadow-[inset_4px_0_0_#374151] dark:bg-gray-800 dark:shadow-[inset_4px_0_0_#6b7280]'
          : isAddRow(row.original as TableRow)
            ? 'cursor-pointer border-b border-b-dashed border-b-gray-300 bg-white shadow-[inset_4px_0_0_#22c55e] hover:bg-gray-50 dark:border-b-gray-700 dark:bg-gray-950 dark:shadow-[inset_4px_0_0_#4ade80] dark:hover:bg-gray-900'
            : 'cursor-pointer transition-[filter] hover:brightness-95 dark:hover:brightness-110',
      },
      style: {
        tr: (row: any) => rowStyle(row.original as TableRow),
      },
    }"
    :ui="{
      th: 'bg-primary-500 py-2.5 text-white',
      td: 'py-3',
    }"
    class="budget-table w-full"
    @select="selectBudget"
  >
    <template #name-cell="{ row }">
      <span v-if="isGroup(row.original)" class="font-semibold text-gray-700 dark:text-gray-200">
        {{ row.original.name }}
      </span>
      <span v-else-if="isAddRow(row.original)" class="flex items-center gap-2 pl-1 font-medium text-primary-600 dark:text-primary-400">
        <UIcon name="heroicons:plus-20-solid" class="size-5" />
        {{ row.original.name }}
      </span>
      <div v-else class="flex items-center gap-3 pl-1">
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-full"
          :style="{
            backgroundColor: `${accentColor(row.original)}26`,
            color: accentColor(row.original),
          }"
        >
          <UIcon :name="row.original.icon ?? budgetIcon(row.original.name)" class="size-5" />
        </div>
        <span class="font-semibold text-gray-900 dark:text-white">{{ row.original.name }}</span>
      </div>
    </template>

    <template #amount-cell="{ row }">
      <span v-if="!isGroup(row.original) && !isAddRow(row.original)" class="font-semibold tabular-nums text-gray-900 dark:text-white">
        {{ formatCurrency(budgetAmount(row.original)) }}
      </span>
    </template>

    <template #progress-cell="{ row }">
      <div v-if="!isGroup(row.original) && !isAddRow(row.original)" class="min-w-56 max-w-xl">
        <div class="mb-1 flex items-center justify-between gap-4 text-xs text-gray-600 dark:text-gray-300">
          <span>{{ row.original.type === 'Income' ? 'Received' : 'Spent' }}</span>
          <span class="tabular-nums">
            {{ formatCurrency(progressAmount(row.original)) }} of {{ formatCurrency(budgetAmount(row.original)) }}
          </span>
        </div>
        <BudgetsProgressBar
          :value="progressAmount(row.original)"
          :max="budgetAmount(row.original)"
          :positive-overflow="row.original.type === 'Income'"
        />
      </div>
    </template>
  </UTable>
</template>

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const table = await readFile(
  new URL('../app/components/budgets/BudgetsTable.vue', import.meta.url),
  'utf8',
)
const budgetsPage = await readFile(
  new URL('../app/pages/budgets/index.vue', import.meta.url),
  'utf8',
)

test('renders budget cards on mobile and the budget table on desktop', () => {
  assert.match(budgetsPage, /grid grid-cols-3 gap-3 pb-24 sm:grid-cols-3 lg:hidden/)
  assert.match(budgetsPage, /hidden pb-6 lg:block/)
  assert.match(budgetsPage, /<BudgetsTable :budgets="desktopBudgets" @select="openBudget" @add="addBudget"/)
  assert.doesNotMatch(budgetsPage, /<BudgetsBudgetsTable/)
})

test('hides mobile controls and summaries on desktop', () => {
  assert.match(budgetsPage, /class="mt-4 mb-2 lg:hidden"/)
  assert.doesNotMatch(budgetsPage, /<div class="mb-3 flex justify-end">/)
})

test('groups expense and income rows within one desktop table', () => {
  assert.match(budgetsPage, /desktopBudgets = computed\(\(\) => \[\.\.\.store\.budgets, \.\.\.store\.incomeBudgets\]\)/)
  assert.match(table, /\{ type: 'Expense', label: 'Expense budgets' \}/)
  assert.match(table, /\{ type: 'Income', label: 'Income budgets' \}/)
  assert.match(table, /groups\.flatMap/)
  assert.match(table, /kind: 'group' as const/)
  assert.match(table, /v-if="isGroup\(row\.original\)"/)
  assert.match(table, /if \(isGroup\(row\.original\)\) return/)
})

test('adds a create-budget action row to the bottom of each group', () => {
  assert.match(table, /kind: 'add' as const/)
  assert.match(table, /name: `Add \$\{group\.type\.toLowerCase\(\)\} budget`/)
  assert.match(table, /emit\('add', row\.original\.type\)/)
  assert.match(table, /v-else-if="isAddRow\(row\.original\)"/)
  assert.match(table, /heroicons:plus-20-solid/)
  assert.match(budgetsPage, /function addBudget\(budgetType: 'Expense' \| 'Income' = selectedType\.value\)/)
  assert.match(budgetsPage, /budgetType === 'Income' \? \{ type: 'income' \} : \{\}/)
})

test('marks group and add-budget rows without shifting table columns', () => {
  assert.match(table, /border-t border-solid border-t-black/)
  assert.match(table, /shadow-\[inset_4px_0_0_#374151\]/)
  assert.match(table, /shadow-\[inset_4px_0_0_#22c55e\]/)
  assert.match(table, /dark:shadow-\[inset_4px_0_0_#6b7280\]/)
  assert.match(table, /dark:shadow-\[inset_4px_0_0_#4ade80\]/)
  assert.doesNotMatch(table, /border-l-4/)
})

test('extends the desktop table from the side navigation to the viewport edge', () => {
  assert.match(budgetsPage, /<UContainer class="max-w-none lg:px-0">/)
})

test('renders the required budget details and reuses the tiered progress bar', () => {
  assert.match(table, /header: 'Budget'/)
  assert.match(table, /header: 'Amount'/)
  assert.match(table, /header: 'Progress'/)
  assert.match(table, /row\.original\.icon \?\? budgetIcon\(row\.original\.name\)/)
  assert.match(table, /<BudgetsProgressBar/)
  assert.match(table, /:positive-overflow="row\.original\.type === 'Income'"/)
})

test('tints each budget row and marks it with its budget colour', () => {
  assert.match(table, /backgroundColor: `\$\{color\}14`/)
  assert.match(table, /boxShadow: `inset 4px 0 0 \$\{color\}`/)
  assert.match(table, /tr: \(row: any\) => rowStyle\(row\.original as TableRow\)/)
})

test('keeps desktop rows selectable and preserves their budget type', () => {
  assert.match(table, /@select="selectBudget"/)
  assert.match(table, /emit\('select', row\.original\.id, row\.original\.type \?\? 'Expense'\)/)
  assert.match(budgetsPage, /budgetType === 'Income' \? \{ type: 'income' \} : \{\}/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')

for (const [file, label] of [
  ['app/components/IncomeEdit.vue', 'income'],
]) {
  test(`${label}: opens on a read-only summary and switches to editing with an icon`, async () => {
    const source = await read(file)
    assert.match(source, /const editing = ref\(false\)/)
    assert.match(source, /<template v-(else-)?if="!editing">/)
    assert.match(source, new RegExp(`aria-label="Edit ${label}"`))
    assert.match(source, /@click="startEditing"/)
    assert.match(source, /<SummaryField/)
  })

  test(`${label}: cancel in edit mode returns to the summary`, async () => {
    const source = await read(file)
    assert.match(source, /function cancelEditing\(\)[\s\S]*editing\.value = false/)
    assert.match(source, /@click="cancelEditing"/)
  })

  test(`${label}: the entity is chosen with the shared picker, not a text box`, async () => {
    const source = await read(file)
    assert.match(source, /<EntityField v-model="entity"/)
    assert.doesNotMatch(source, /placeholder="Enter a pay(ee|er)\.\.\."/)
    assert.match(source, /budgetAllEntities/)
    assert.match(source, /fetchBudgetEntities/)
  })
}

test('the edit field reuses the create flow entity picker', async () => {
  const field = await read('app/components/EntityField.vue')
  assert.match(field, /<CashflowCreateStepEntity/)
  assert.match(field, /:suggestions="suggestions"/)
})

test('expense and income modals are titled without "Edit" because they open read-only', async () => {
  for (const file of [
    'app/components/budgets/ExpensesList.vue',
    'app/components/budgets/IncomeRecordsList.vue',
    'app/components/cashflow/AllExpenses.vue',
    'app/components/cashflow/AllIncome.vue',
  ]) {
    assert.doesNotMatch(await read(file), /<h2[^>]*>Edit (Expense|Income)<\/h2>/, file)
  }
  const table = await read('app/components/cashflow/TransactionsTable.vue')
  assert.doesNotMatch(table, /'Edit Income'|'Edit Expense'/)
})

test('tapping an existing entity saves it right away and reopening shows the list', async () => {
  const source = await readFile(new URL('../app/components/cashflow/create/StepEntity.vue', import.meta.url), 'utf8')
  assert.match(source, /function applySuggestion[\s\S]*?emit\('save', \{ entity: suggestion, selectedEntity: suggestion \}\)/)
  assert.match(source, /draftEntity\.value = props\.selectedEntity \? '' : props\.entity/)
  assert.doesNotMatch(source, /v-if="draftSelectedEntity"/)
})


test('the expense card has tap-to-edit fields laid out like the card, with the date under the amount', async () => {
  const card = await read('app/components/ExpenseCard.vue')
  const check = await read('app/components/FieldConfirmButton.vue')
  assert.match(card, /borderLeft: .4px solid \$\{borderColor\}./)
  for (const label of ['amount', 'payee', 'notes', 'account']) {
    assert.match(card, new RegExp(`aria-label="Edit ${label}"`))
  }
  assert.match(card, /aria-label="Edit date"/)
  assert.doesNotMatch(card, /heroicons:pencil-square/)
  assert.doesNotMatch(card, />\s*\{\{ chosenBudget/)
  // Field order: amount, payee, notes, date, account. The date uses the small text size.
  const order = ['Edit amount', 'Edit payee', 'Edit notes', 'Edit date', 'Edit account'].map(label => card.indexOf(label))
  assert.deepEqual(order, [...order].sort((x, y) => x - y))
  assert.match(card, /<div class="relative ml-2 inline-flex items-center gap-1.5 text-xs text-gray-400">/)
  // Icons beside payee, comment and date, which are indented a little.
  for (const icon of ['fa7-solid:user', 'fa7-solid:comment-dots', 'fa7-solid:calendar']) {
    assert.match(card, new RegExp(icon))
    assert.match(await read('nuxt.config.ts'), new RegExp(`'${icon}'`))
  }
  // The amount keeps its size and color while it is edited.
  assert.match(card, /<input[^>]*text-xl font-semibold text-info/)
  assert.match(card, /<input[^>]*w-2\/5/)
  // The notes field is 16px so iOS does not zoom the page when it is focused.
  assert.match(card, /<UTextarea[\s\S]*?:ui="\{ base: 'text-base' \}"/)
  // Only one field is edited at a time, and each is saved on its own.
  assert.match(card, /:disabled="!!activeField"/)
  assert.match(check, /heroicons-solid:check-circle/)
  assert.match(card, /async function commit\(patch/)
  assert.match(card, /store\.updateExpense\(/)
})

test('the date opens the picker on one tap and saves as soon as a date is chosen', async () => {
  const card = await read('app/components/ExpenseCard.vue')
  assert.match(card, /type="date"/)
  assert.match(card, /showPicker/)
  assert.match(card, /@change="onDateChange"/)
  assert.match(card, /function onDateChange[\s\S]*?void commit\(\{ date: value \}\)/)
  assert.doesNotMatch(card, /'date'/)
})

test('the card expands with animated spacing and collapses when tapped away from a field', async () => {
  const card = await read('app/components/ExpenseCard.vue')
  const row = await read('app/components/ExpandRow.vue')
  assert.match(row, /transition-\[padding\]/)
  assert.match(row, /grid-rows-\[0fr\]/)
  assert.match(card, /\.animate\(/)
  assert.match(card, /prefers-reduced-motion/)
  assert.match(card, /closest\('button, input, textarea, select, a'\)[\s\S]*?expanded\.value = false/)
  assert.doesNotMatch(card, /label="Close"/)
})

test('the card deletes by swiping left, with the usual confirmation', async () => {
  const card = await read('app/components/ExpenseCard.vue')
  assert.match(card, /@pointerdown="onPointerDown"/)
  assert.match(card, /aria-label="Delete expense"/)
  assert.match(card, /confirm\('Are you sure you want to delete this expense/)
})

test('lists show one expandable card per expense and tables keep the modal', async () => {
  for (const file of ['app/components/budgets/ExpensesList.vue', 'app/components/cashflow/AllExpenses.vue']) {
    const source = await read(file)
    assert.match(source, /<ExpenseCard[\s\S]*?:expanded="expandedId === hit\.id"/, file)
    assert.doesNotMatch(source, /ExpenseEdit/, file)
  }
  assert.doesNotMatch(await read('app/components/cashflow/AllExpenses.vue'), /<UModal/)
  assert.match(await read('app/components/cashflow/TransactionsTable.vue'), /<ExpenseCard[\s\S]*?modal/)
  // Choosing a budget opens over the card instead of replacing it.
  assert.match(await read('app/components/ExpenseCard.vue'), /<UModal v-model:open="choosingBudget">/)
})

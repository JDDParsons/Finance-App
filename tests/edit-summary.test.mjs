import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')

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
  assert.match(card, /<div class="relative inline-flex items-center gap-1.5 text-xs text-gray-400">/)
  assert.doesNotMatch(card, /pl-2|ml-2/)
  // The payee is not indented and has the library icon; comment and date are indented a little.
  assert.match(card, /<UIcon name="heroicons-solid:building-library"/)
  assert.match(card, /<button\s+type="button"\s+class="flex items-center gap-1.5 text-left text-sm/)
  for (const icon of ['fa7-solid:comment-dots', 'fa7-solid:calendar']) {
    assert.match(card, new RegExp(icon))
    assert.match(await read('nuxt.config.ts'), new RegExp(`'${icon}'`))
  }
  // The amount keeps its size and color while it is edited.
  assert.match(card, /<input[^>]*text-xl font-semibold text-info/)
  assert.match(card, /<input[^>]*w-\[calc\(40%-1\.5rem\)\]/)
  // The notes field is 16px so iOS does not zoom the page when it is focused.
  assert.match(card, /<UTextarea[\s\S]*?:ui="\{ base: 'text-base' \}"/)
  // Fields change a draft, and one green check saves every change in a single update.
  assert.match(card, /const draft = reactive/)
  assert.match(card, /async function saveAll\(\)/)
  assert.equal((card.match(/store\.updateExpense\(/g) ?? []).length, 1)
  assert.doesNotMatch(card, /FieldConfirmButton/)
  assert.match(card, /heroicons-solid:check-circle" class="size-7 text-green-500"/)
})

test('the date opens the picker on one tap and the chosen date goes into the draft', async () => {
  const card = await read('app/components/ExpenseCard.vue')
  assert.match(card, /type="date"/)
  assert.match(card, /showPicker/)
  assert.match(card, /@change="onDateChange"/)
  assert.match(card, /function onDateChange[\s\S]*?draft\.date = value/)
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

test('the income card is the expense card for income: same fields, layout and gestures', async () => {
  const card = await read('app/components/IncomeCard.vue')
  const order = ['Edit amount', 'Edit payer', 'Edit notes', 'Edit date', 'Edit account'].map(label => card.indexOf(label))
  assert.ok(order.every(position => position > -1))
  assert.deepEqual(order, [...order].sort((x, y) => x - y))
  assert.match(card, /<input[^>]*w-2\/5/)
  assert.match(card, /<UTextarea[\s\S]*?:ui="\{ base: 'text-base' \}"/)
  for (const icon of ['fa7-solid:user', 'fa7-solid:comment-dots', 'fa7-solid:calendar']) assert.match(card, new RegExp(icon))
  // It reads and saves income records, one field at a time.
  assert.match(card, /store\.income\.find/)
  assert.match(card, /store\.updateIncome\(/)
  assert.match(card, /store\.removeIncome\(/)
  assert.match(card, /:is-income="true"/)
  assert.match(card, /@change="onDateChange"/)
  assert.match(card, /@pointerdown="onPointerDown"/)
  assert.match(card, /aria-label="Delete income"/)
  assert.match(card, /\.animate\(/)
  assert.doesNotMatch(card, /updateExpense|removeExpense|budgetHits/)
})

test('income lists show one expandable card per record and the table keeps the modal', async () => {
  for (const file of ['app/components/budgets/IncomeRecordsList.vue', 'app/components/cashflow/AllIncome.vue']) {
    const source = await read(file)
    assert.match(source, /<IncomeCard[\s\S]*?:expanded="expandedId === row\.id"/, file)
    assert.doesNotMatch(source, /IncomeEdit|<UModal/, file)
  }
  assert.match(await read('app/components/cashflow/TransactionsTable.vue'), /<IncomeCard[\s\S]*?modal/)
})

test('the create flow pills share one style: same size and text, green when filled, budget keeps its colour', async () => {
  const pill = await read('app/components/TagPill.vue')
  assert.match(pill, /w-\[6\.5rem\]/)
  assert.match(pill, /text-xs/)
  assert.match(pill, /truncate/)
  assert.match(pill, /border-blue-500/)
  assert.match(pill, /bg-blue-100/)
  assert.match(pill, /\$\{tint\}33/)
  const step = await read('app/components/cashflow/create/StepAmount.vue')
  assert.equal((step.match(/<TagPill/g) ?? []).length, 4)
  for (const file of ['DateTagPicker', 'AccountTagPicker', 'BudgetTagPicker']) {
    assert.match(await read(`app/components/${file}.vue`), /<TagPill/, file)
  }
  // The payee pill keeps its icon and gets its text from the chosen value.
  assert.match(step, /:label="entityLabel \|\| entityButtonLabel"/)
  assert.match(await read('app/components/AccountTagPicker.vue'), /accountDisplayName\(selectedAccount\)/)
})

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

test('the expense modal is laid out like its card, with tap-to-edit fields', async () => {
  const modal = await read('app/components/ExpenseEdit.vue')
  const check = await read('app/components/FieldConfirmButton.vue')
  assert.match(modal, /borderLeft: .4px solid \$\{borderColor\}./)
  assert.match(modal, /text-xl font-semibold text-info/)
  // Fields are tapped directly: no pencil icons, and no budget name beside the budget icon.
  for (const label of ['amount', 'date', 'payee', 'notes', 'account']) {
    assert.match(modal, new RegExp(`aria-label="Edit ${label}"`))
  }
  assert.doesNotMatch(modal, /heroicons:pencil-square/)
  assert.doesNotMatch(modal, />\s*\{\{ chosenBudget/)
  // Only one field is edited at a time: the others cannot be tapped.
  assert.match(modal, /:disabled="!!activeField"/)
  assert.match(check, /heroicons-solid:check-circle/)
  // Each confirmed field is saved on its own through the normal update.
  assert.match(modal, /async function commit\(patch/)
  assert.match(modal, /store\.updateExpense\(/)
  assert.doesNotMatch(modal, /Update Expense/)
})

test('the expense modal closes with a Close button and deletes by swiping left', async () => {
  const modal = await read('app/components/ExpenseEdit.vue')
  assert.match(modal, /label="Close"/)
  assert.doesNotMatch(modal, /heroicons:x-mark/)
  assert.match(modal, /@pointerdown="onPointerDown"/)
  assert.match(modal, /aria-label="Delete expense"/)
  assert.match(modal, /confirm\('Are you sure you want to delete this expense/)
})

test('tapping an expense card expands it in place instead of opening a modal', async () => {
  for (const file of ['app/components/budgets/ExpensesList.vue', 'app/components/cashflow/AllExpenses.vue']) {
    const source = await read(file)
    assert.match(source, /v-if="expandedId === hit\.id"/, file)
    assert.doesNotMatch(source, /<h2 class="text-2xl font-bold">Expense<\/h2>/, file)
  }
  // The cashflow list has no modal left; the budget page keeps one for its desktop table.
  assert.doesNotMatch(await read('app/components/cashflow/AllExpenses.vue'), /<UModal/)
  // Choosing a budget opens over the card instead of replacing it.
  assert.match(await read('app/components/ExpenseEdit.vue'), /<UModal v-model:open="choosingBudget">/)
})

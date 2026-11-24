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

test('the expense modal is laid out like its card with one edit icon per field', async () => {
  const modal = await read('app/components/ExpenseEdit.vue')
  const button = await read('app/components/FieldEditButton.vue')
  assert.match(modal, /borderLeft: .4px solid \$\{borderColor\}./)
  assert.match(modal, /text-xl font-semibold text-info/)
  for (const field of ['amount', 'date', 'budget', 'payee', 'notes', 'account']) {
    assert.match(modal, new RegExp(`<FieldEditButton label="${field}"`))
  }
  // Only one field is edited at a time: the other pencils are locked away.
  assert.match(modal, /:locked="!!activeField"/)
  assert.match(button, /v-else-if="!locked"/)
  assert.match(button, /heroicons-solid:check-circle/)
  assert.match(button, /heroicons:pencil-square/)
  // Each confirmed field is saved on its own through the normal update.
  assert.match(modal, /async function commit\(patch/)
  assert.match(modal, /store\.updateExpense\(/)
  assert.doesNotMatch(modal, /Update Expense/)
})

test('hosts show the expense modal without a wrapping card and header', async () => {
  for (const file of ['app/components/budgets/ExpensesList.vue', 'app/components/cashflow/AllExpenses.vue']) {
    const source = await read(file)
    assert.doesNotMatch(source, /<h2 class="text-2xl font-bold">Expense<\/h2>/, file)
    assert.doesNotMatch(source, /:expense-id=[\s\S]*@update=/, file)
  }
})

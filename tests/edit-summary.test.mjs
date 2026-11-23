import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')

for (const [file, label] of [
  ['app/components/ExpenseEdit.vue', 'expense'],
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

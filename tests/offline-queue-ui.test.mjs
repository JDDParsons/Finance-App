import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const components = [
  'app/components/budgets/ExpensesList.vue',
  'app/components/budgets/IncomeRecordsList.vue',
  'app/components/cashflow/AllExpenses.vue',
  'app/components/cashflow/AllIncome.vue',
  'app/components/cashflow/AllTransfers.vue',
]

test('rows waiting to sync can still be edited and deleted', async () => {
  for (const file of components) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    // The status label may read these fields; no handler may refuse because of them.
    assert.doesNotMatch(source, /must sync before/, file)
    assert.doesNotMatch(source, /sync status controls/, file)
    assert.doesNotMatch(source, /if \([^\n]*pending_sync[^\n]*\) \{\s*alert/, file)
  }
})

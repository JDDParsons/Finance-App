import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop cashflow table places notes immediately before amount', async () => {
  const component = await readFile(
    new URL('../app/components/cashflow/TransactionsTable.vue', import.meta.url),
    'utf8',
  )
  const columns = component.match(/const tableColumns = \[([\s\S]*?)\n\]/)?.[1]

  assert.ok(columns, 'cashflow table columns should be defined')
  assert.match(columns, /id: 'notes'[\s\S]*?id: 'amount'/)
  assert.doesNotMatch(columns, /id: 'amount'[\s\S]*?id: 'notes'/)
})

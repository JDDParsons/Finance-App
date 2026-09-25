import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const component = await readFile(
  new URL('../app/components/cashflow/TransactionsTable.vue', import.meta.url),
  'utf8',
)

test('renders cashflow dates in neutral badges', () => {
  assert.match(component, /<UBadge color="neutral" variant="subtle">\s*\{\{ formatDate\(row\.original\.date\) \}\}/)
})

test('connects Sunday-to-Saturday groups with a vertical week rail', () => {
  assert.match(component, /date\.setUTCDate\(date\.getUTCDate\(\) - date\.getUTCDay\(\)\)/)
  assert.match(component, /'cashflow-week-rail'/)
  assert.match(component, /rail\.starts \? 'cashflow-week-rail-start'/)
  assert.match(component, /rail\.ends \? 'cashflow-week-rail-end'/)
  assert.match(component, /border-left: 1px solid var\(--ui-border-accented\)/)
})

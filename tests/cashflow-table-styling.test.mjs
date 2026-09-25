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
  assert.match(component, /id: 'weekRail'/)
  assert.match(component, /meta: \{ class: \{ th: 'w-6 p-0', td: 'relative w-6 p-0' \} \}/)
  assert.match(component, /#weekRail-cell="\{ row \}"/)
  assert.match(component, /border-l-2 border-gray-400 dark:border-gray-500/)
  assert.match(component, /\.starts \? 'top-1\/2' : 'top-0'/)
  assert.match(component, /\.ends \? 'bottom-1\/2' : 'bottom-0'/)
})

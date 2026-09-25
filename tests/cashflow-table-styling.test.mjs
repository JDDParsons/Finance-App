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

test('marks Sundays with a left-side weekly separator', () => {
  assert.match(component, /getUTCDay\(\) === 0/)
  assert.match(component, /v-if="startsWeek\(row\.original\)"/)
  assert.match(component, /class="w-4 shrink-0 border-t border-gray-300 dark:border-gray-700"/)
  assert.match(component, /aria-hidden="true"/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  confirmationMessage,
  describeRecords,
  filterEntities,
  normalizeEntityKey,
  planRename,
  rankEntitiesByBudget,
  sortEntities,
  summarizeEntities,
} from '../utils/entities.ts'

const entity = (overrides) => ({
  key: 'costco', name: 'Costco', expenseCount: 38, incomeCount: 0, expenseTotal: 1200, incomeTotal: 0, ...overrides,
})

test('look-alike spellings share one key', () => {
  assert.equal(normalizeEntityKey('  Costco '), 'costco')
  assert.equal(normalizeEntityKey('COSTCO'), 'costco')
  assert.equal(normalizeEntityKey('Dinner   Party'), 'dinner party')
  assert.equal(normalizeEntityKey('ＣＯＳＴＣＯ'), 'costco')
  assert.equal(normalizeEntityKey(null), '')
})

test('rows are grouped by key, with counts and totals, expenses and income apart', () => {
  const list = summarizeEntities(
    [
      { id: 'e1', entity: 'Costco', amount: '10.50', date: '2026-11-01' },
      { id: 'e2', entity: 'costco ', amount: 4, date: '2026-11-05' },
      { id: 'e3', entity: 'Costco', amount: 5, date: '2026-10-05' },
      { id: 'e4', entity: '', amount: 9, date: '2026-10-05' },
    ],
    [{ id: 'i1', entity: 'COSTCO', amount: 100, date: '2026-11-02' }, { id: 'i2', entity: 'Employer', amount: 50, date: '2026-11-02' }]
  )
  assert.equal(list.length, 2)
  const costco = list.find(item => item.key === 'costco')
  assert.equal(costco.name, 'Costco')
  assert.equal(costco.expenseCount, 3)
  assert.equal(costco.incomeCount, 1)
  assert.equal(costco.expenseTotal, 19.5)
  assert.equal(costco.incomeTotal, 100)
})

test('cached months that overlap do not count a row twice', () => {
  const row = { id: 'e1', entity: 'Costco', amount: 10, date: '2026-11-01' }
  const [costco] = summarizeEntities([row, row], [])
  assert.equal(costco.expenseCount, 1)
  assert.equal(costco.expenseTotal, 10)
})

test('the most used spelling is shown, then the most recent', () => {
  const [tie] = summarizeEntities([
    { id: '1', entity: 'costco', amount: 1, date: '2026-01-01' },
    { id: '2', entity: 'Costco', amount: 1, date: '2026-02-01' },
  ], [])
  assert.equal(tie.name, 'Costco')
  const [most] = summarizeEntities([
    { id: '1', entity: 'costco', amount: 1, date: '2026-03-01' },
    { id: '2', entity: 'Costco', amount: 1, date: '2026-01-01' },
    { id: '3', entity: 'Costco', amount: 1, date: '2026-01-02' },
  ], [])
  assert.equal(most.name, 'Costco')
})

test('sorting by name, record count and total', () => {
  const list = [
    entity({ key: 'b', name: 'b shop', expenseCount: 1, expenseTotal: 900 }),
    entity({ key: 'a', name: 'A shop', expenseCount: 5, expenseTotal: 10 }),
    entity({ key: 'c', name: 'C shop', expenseCount: 5, expenseTotal: 20, incomeCount: 1, incomeTotal: 1 }),
  ]
  assert.deepEqual(sortEntities(list, 'name').map(item => item.key), ['a', 'b', 'c'])
  assert.deepEqual(sortEntities(list, 'count').map(item => item.key), ['c', 'a', 'b'])
  assert.deepEqual(sortEntities(list, 'total').map(item => item.key), ['b', 'c', 'a'])
})

test('search matches the normalized name', () => {
  const list = [entity({ key: 'costco' }), entity({ key: 'cafe luna', name: 'Cafe Luna' })]
  assert.deepEqual(filterEntities(list, ' COST').map(item => item.key), ['costco'])
  assert.equal(filterEntities(list, '').length, 2)
  assert.equal(filterEntities(list, 'zzz').length, 0)
})

test('a new name is a rename, a merge, a case-only rename, unchanged or invalid', () => {
  const costco = entity({ key: 'costco', name: 'costco', expenseCount: 38, incomeCount: 5 })
  const list = [costco, entity({ key: 'walmart', name: 'Walmart', expenseCount: 2 })]

  assert.deepEqual(planRename(list, costco, 'Costco Wholesale'), { kind: 'rename', name: 'Costco Wholesale', expenses: 38, income: 5 })
  assert.equal(planRename(list, costco, 'Costco').kind, 'rename')
  assert.equal(planRename(list, costco, 'costco').kind, 'unchanged')
  assert.equal(planRename(list, costco, '   ').kind, 'invalid')
  assert.equal(planRename(list, costco, 'x'.repeat(101)).kind, 'invalid')

  const merge = planRename(list, costco, '  WALMART ')
  assert.equal(merge.kind, 'merge')
  assert.equal(merge.name, 'Walmart')
  assert.equal(merge.into.key, 'walmart')
})

test('confirmation text names the change and how many records it touches', () => {
  const costco = entity({ key: 'costco', name: 'costco', expenseCount: 38, incomeCount: 5 })
  assert.equal(describeRecords(38, 5), '43 records (38 expenses, 5 income)')
  assert.equal(describeRecords(1, 0), '1 record (1 expense)')
  assert.equal(
    confirmationMessage(costco, { kind: 'rename', name: 'Costco', expenses: 38, income: 5 }),
    "Rename 'costco' to 'Costco'? This changes 43 records (38 expenses, 5 income). This cannot be undone."
  )
  assert.match(
    confirmationMessage(costco, { kind: 'merge', name: 'Walmart', into: entity({}), expenses: 38, income: 5 }),
    /^Merge 'costco' into 'Walmart'\?/
  )
})

test('the migration groups by a normalized key, stays in the household and skips transfers', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261123120000_add_entity_management.sql', import.meta.url), 'utf8')
  assert.match(sql, /CREATE FUNCTION "finance-app"\."entity_key"/)
  assert.match(sql, /normalize\(.*NFKC\)/)
  assert.match(sql, /CREATE FUNCTION "finance-app"\."list_entities"/)
  assert.match(sql, /CREATE FUNCTION "finance-app"\."rename_entity"/)
  assert.equal((sql.match(/SECURITY DEFINER/g) ?? []).length, 2)
  assert.equal((sql.match(/SET search_path = ''/g) ?? []).length, 3)
  assert.equal((sql.match(/"type" IN \('Expense', 'Income'\)/g) ?? []).length, 3)
  assert.ok((sql.match(/"household_id" = current_household_id/g) ?? []).length >= 3)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION "finance-app"\."rename_entity"\(text, text\) TO authenticated/)
  assert.match(sql, /REVOKE ALL ON FUNCTION "finance-app"\."rename_entity"\(text, text\) FROM PUBLIC, anon/)
})

test('routes, page and sync-first rule are wired together', async () => {
  const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.match(await read('server/api/entities/index.get.ts'), /listEntities\(supabase\)/)
  assert.match(await read('server/api/entities/rename.post.ts'), /renameEntity\(supabase, key, name\)/)
  const page = await read('app/pages/settings/entities.vue')
  assert.match(page, /ensureQueueEmpty/)
  assert.match(page, /pendingSyncCount/)
  assert.match(page, /failedSyncCount/)
  assert.match(page, /precacheRecentMonths\(true\)/)
  assert.match(page, /source === 'cache'/)
})

test('payee and payer suggestions are ranked by use, then by most recent, per budget', () => {
  // Newest first, as the query returns them.
  const ranked = rankEntitiesByBudget([
    { budget_id: 'a', entity: 'Recent Once' },
    { budget_id: 'a', entity: 'Often' },
    { budget_id: 'a', entity: 'Older Once' },
    { budget_id: 'a', entity: ' Often ' },
    { budget_id: 'b', entity: 'Older Once' },
    { budget_id: 'a', entity: '  ' },
    { budget_id: null, entity: 'No Budget' },
  ])
  assert.deepEqual(ranked.get('a'), ['Often', 'Recent Once', 'Older Once'])
  assert.deepEqual(ranked.get('b'), ['Older Once'])
  assert.equal(ranked.size, 2)
})

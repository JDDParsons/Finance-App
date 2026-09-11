import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildOptimisticRow } from '../utils/offlineRows.ts'

test('builds optimistic expense, income, and transfer rows with stable operation IDs', () => {
  const expense = buildOptimisticRow('expense', 'expense-id', 'user-id', {
    amount: '12.50', date: '2026-09-11', entity: 'Cafe', budgetId: 'budget-id', accountId: 'account-id',
  })
  const income = buildOptimisticRow('income', 'income-id', 'user-id', {
    amount: 500, date: '2026-09-11', entity: 'Employer', budgetId: null, accountId: 'account-id',
  })
  const transfer = buildOptimisticRow('transfer', 'transfer-id', 'user-id', {
    amount: 100, date: '2026-09-11', fromAccountId: 'from-id', toAccountId: 'to-id',
  })

  assert.equal(expense.id, 'expense-id')
  assert.equal(expense.client_operation_id, 'expense-id')
  assert.equal(expense.pending_sync, true)
  assert.equal(expense.type, 'Expense')
  assert.equal(income.type, 'Income')
  assert.equal(transfer.type, 'Transfer')
  assert.equal(transfer.account_id, 'from-id')
  assert.equal(transfer.destination_account_id, 'to-id')
  assert.equal(transfer.entity, null)
})

test('idempotent create migration scopes operations to the authenticated household', async () => {
  const sql = await readFile(new URL(
    '../supabase/migrations/20260911130000_idempotent_budget_hit_creates.sql',
    import.meta.url
  ), 'utf8')

  assert.match(sql, /ADD COLUMN "client_operation_id" uuid/)
  assert.match(sql, /UNIQUE INDEX "Budget_Hit_household_client_operation_key"/)
  assert.match(sql, /SECURITY DEFINER/)
  assert.match(sql, /SET search_path = ''/)
  assert.match(sql, /"auth"\."uid"\(\)/)
  assert.match(sql, /"household_id" = current_household_id/)
  assert.match(sql, /ON CONFLICT \("household_id", "client_operation_id"\)/)
  assert.match(sql, /GRANT EXECUTE[\s\S]*TO authenticated/)
  assert.match(sql, /REVOKE ALL[\s\S]*FROM PUBLIC, anon/)
})

test('create APIs use the outbox while updates and deletes remain online-only', async () => {
  const hitsApi = await readFile(new URL('../app/composables/api/useHitsApi.ts', import.meta.url), 'utf8')
  const cache = await readFile(new URL('../app/utils/offlineFinanceCache.client.ts', import.meta.url), 'utf8')
  const appData = await readFile(new URL('../app/composables/useAppData.ts', import.meta.url), 'utf8')

  assert.match(hitsApi, /createOrQueueOffline\('expense'/)
  assert.match(hitsApi, /createOrQueueOffline\('income'/)
  assert.match(hitsApi, /createOrQueueOffline\('transfer'/)
  assert.match(hitsApi, /apiFetch<any>\(`\/api\/hits\/\$\{id\}`/)
  assert.match(cache, /createObjectStore\('outbox'/)
  assert.match(cache, /createIndex\('by-user', 'userId'\)/)
  assert.match(appData, /replayOfflineCreates/)
  assert.match(appData, /window\.addEventListener\('online'/)
})

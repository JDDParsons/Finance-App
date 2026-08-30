import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL('../supabase/migrations/20260830150000_delete_budget_without_periods.sql', import.meta.url)

test('deleting a final period removes only an entirely unreferenced budget', async () => {
  const sql = await readFile(migrationUrl, 'utf8')
  const periodDelete = sql.indexOf('DELETE FROM "finance-app"."Budget_Period"')
  const budgetDelete = sql.indexOf('DELETE FROM "finance-app"."Budgets"')

  assert.ok(periodDelete >= 0)
  assert.ok(budgetDelete > periodDelete)

  const cleanup = sql.slice(budgetDelete)
  assert.match(cleanup, /NOT EXISTS \(\s*SELECT 1 FROM "finance-app"\."Budget_Period"/)
  assert.match(cleanup, /NOT EXISTS \(\s*SELECT 1 FROM "finance-app"\."Budget_Hit"/)
  assert.match(cleanup, /"household_id" = current_household_id/)
})

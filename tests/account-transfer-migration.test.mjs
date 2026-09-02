import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = [
  '../supabase/migrations/20260901120000_add_account_transfers.sql',
  '../supabase/migrations/20260901123000_make_transfers_view_only.sql',
  '../supabase/migrations/20260902120000_allow_transfer_updates_and_deletes.sql',
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')

test('migration stores transfers in Budget_Hit with a constrained destination account', () => {
  assert.match(sql, /ADD COLUMN "destination_account_id" uuid/)
  assert.match(sql, /"type" IN \('Expense', 'Income', 'Transfer'\)/)
  assert.match(sql, /"account_id" <> "destination_account_id"/)
  assert.match(sql, /"amount" > 0/)
  assert.match(sql, /"type" <> 'Transfer'[\s\S]*"destination_account_id" IS NULL/)
})

test('migration validates household accounts and protects transfer history', () => {
  assert.match(sql, /CREATE FUNCTION "finance-app"\."validate_transfer_accounts"/)
  assert.match(sql, /"household_id" = NEW\."household_id"/)
  assert.match(sql, /CREATE FUNCTION "finance-app"\."delete_account"/)
  assert.match(sql, /CREATE FUNCTION "finance-app"\."prevent_transfer_modification"/)
  assert.match(sql, /Transfers are view-only/)
  assert.match(sql, /DROP TRIGGER IF EXISTS "budget_hit_prevent_transfer_modification_trg"/)
  assert.match(sql, /DROP FUNCTION IF EXISTS "finance-app"\."prevent_transfer_modification"/)
  assert.match(sql, /Account has transfer history and cannot be deleted/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION "finance-app"\."delete_account"\(uuid\) TO authenticated/)
})

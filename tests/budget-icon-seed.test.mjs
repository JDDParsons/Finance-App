import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL('../supabase/migrations/20260902210000_seed_budget_icons.sql', import.meta.url)
const seedUrl = new URL('../supabase/seed.sql', import.meta.url)

test('budget icon migration replaces missing and legacy icons without overwriting valid selections', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /update "finance-app"\."Budgets"/i)
  assert.match(sql, /where "icon" is null/i)
  assert.match(sql, /or btrim\("icon"\) = ''/i)
  assert.match(sql, /or "icon" !~ '\^\[a-z0-9\]/i)
  assert.match(sql, /else 'heroicons:wallet-solid'/i)
  assert.match(sql, /'Groceries'|grocer/i)
  assert.match(sql, /heroicons:shopping-cart-solid/i)
  assert.match(sql, /streamline-ultimate:car-3-bold/i)
})

test('local seed budgets use Iconify identifiers instead of emoji', async () => {
  const sql = await readFile(seedUrl, 'utf8')
  const budgetSeed = sql.slice(sql.indexOf('-- 6. Budgets'), sql.indexOf('-- 7. Monthly budget periods'))

  assert.doesNotMatch(budgetSeed, /[🌀-🫿]/u)
  assert.match(budgetSeed, /'Groceries'.*'heroicons:shopping-cart-solid'/)
  assert.match(budgetSeed, /'Dining Out'.*'heroicons:cake-solid'/)
  assert.match(budgetSeed, /'Gas'.*'streamline-ultimate:car-3-bold'/)
  assert.match(budgetSeed, /'Utilities'.*'heroicons:bolt-solid'/)
  assert.match(budgetSeed, /'Entertainment'.*'heroicons:film-solid'/)
  assert.match(budgetSeed, /'Rent'.*'heroicons:home-solid'/)
})

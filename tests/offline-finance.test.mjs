import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildTrailingSavingsTotals } from '../utils/savingsTotals.ts'

test('builds twelve newest-first savings totals across a year boundary', () => {
  const totals = buildTrailingSavingsTotals([
    { date: '2026-01-02', amount: 2000, type: 'Income' },
    { date: '2026-01-03', amount: '250.50', type: 'Expense' },
    { date: '2025-12-31', amount: 100, type: 'Expense' },
    { date: '2025-01-01', amount: 999, type: 'Income' },
  ], 2026, 1)

  assert.equal(totals.length, 12)
  assert.deepEqual(totals[0], { year: 2026, month: 1, income: 2000, expenses: 250.5 })
  assert.deepEqual(totals[1], { year: 2025, month: 12, income: 0, expenses: 100 })
  assert.deepEqual(totals.at(-1), { year: 2025, month: 2, income: 0, expenses: 0 })
})

test('bootstrap replaces the startup request fan-out and includes savings', async () => {
  const appData = await readFile(new URL('../app/composables/useAppData.ts', import.meta.url), 'utf8')
  const bootstrap = await readFile(new URL('../server/api/bootstrap.get.ts', import.meta.url), 'utf8')

  assert.match(appData, /getOfflineFinanceSnapshot/)
  assert.match(appData, /getBootstrap\(year, month\)/)
  assert.doesNotMatch(appData, /accountsStore\.fetchAccounts/)
  assert.doesNotMatch(appData, /savingsStore\.fetchAll/)
  assert.match(bootstrap, /getTrailingSavingsTotals/)
  assert.match(bootstrap, /schemaVersion: 1/)
})

test('authenticated API responses are not cached by the service worker', async () => {
  const config = await readFile(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
  const middleware = await readFile(new URL('../server/middleware/01.api-cache-control.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(config, /cacheName:\s*'nuxt-api'/)
  assert.match(config, /additionalManifestEntries:\s*\[[\s\S]*url: baseURL, revision: appShellRevision/)
  assert.match(config, /navigateFallback: baseURL/)
  assert.match(middleware, /private, no-store/)
})

test('sign-out purges persisted and in-memory finance data', async () => {
  const auth = await readFile(new URL('../app/composables/supabase/auth.ts', import.meta.url), 'utf8')

  assert.match(auth, /clearOfflineFinanceCache\(\)/)
  assert.match(auth, /useProfileStore\(\)\.clear\(\)/)
  assert.match(auth, /clearNuxtState\(\)/)
})

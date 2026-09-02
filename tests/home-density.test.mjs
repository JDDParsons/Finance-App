import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home dashboard uses compact spacing between and within cards', async () => {
  const homePage = await readFile(new URL('../app/pages/home.vue', import.meta.url), 'utf8')

  assert.match(homePage, /grid grid-cols-2 gap-3 pb-20 pt-3/)
  assert.match(homePage, /body: 'p-3 sm:p-4'/)
  assert.equal(homePage.match(/:ui="compactCardUi"/g)?.length, 6)
  assert.match(homePage, /\{\{ periodLabel \}\}/)
  assert.match(homePage, /donutIncome\.value\.amount - totalExpenses\.value/)
  assert.match(homePage, /totalExpenses\.value \/ Math\.max\(donutIncome\.value\.amount, 1\)/)
  assert.match(homePage, />Expenses and income this month<\/h3>/)
  assert.match(homePage, /grid grid-cols-3 gap-2 text-center/)
  assert.doesNotMatch(homePage, /expenseMoMChange/)
})

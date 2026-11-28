import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { countUpValue, describeRemaining, formatWholeDollars } from '../utils/remainingFunds.ts'

const november = { monthName: 'November' }

test('says what is left for the month', () => {
  assert.deepEqual(describeRemaining({ ...november, income: 5000, expenses: 3765.6 }), {
    amount: 1234,
    isOverspent: false,
    label: 'Remaining for November',
  })
})

test('says by how much the month is overspent', () => {
  const result = describeRemaining({ ...november, income: 1000, expenses: 1250 })
  assert.equal(result.amount, -250)
  assert.equal(result.isOverspent, true)
  assert.equal(result.label, 'Overspent in November')
  assert.equal(formatWholeDollars(result.amount), '$250')
})

test('an amount that rounds to nothing is not overspent', () => {
  const result = describeRemaining({ ...november, income: 100, expenses: 100.3 })
  assert.equal(result.amount, 0)
  assert.equal(Object.is(result.amount, 0), true)
  assert.equal(result.isOverspent, false)
})

test('formats whole dollars with separators and no sign', () => {
  assert.equal(formatWholeDollars(1234567.4), '$1,234,567')
  assert.equal(formatWholeDollars(-1234.6), '$1,235')
})

test('counts from one amount to another and stops on it', () => {
  assert.equal(countUpValue(0, 1000, 0), 0)
  assert.equal(countUpValue(0, 1000, 0.5), 875)
  assert.equal(countUpValue(0, 1000, 1), 1000)
  assert.equal(countUpValue(0, 1000, 3), 1000)
  assert.equal(countUpValue(400, 100, -1), 400)
})

test('the home page shows the remaining card under the greeting, with the chart figures', async () => {
  const homePage = await readFile(new URL('../app/pages/home.vue', import.meta.url), 'utf8')

  assert.match(homePage, /<HomeGreeting[\s\S]*?<HomeRemainingCard[\s\S]*?Total expenses and income/)
  assert.match(homePage, /:income="donutIncome\.amount"\s+:expenses="totalExpenses"/)
})

test('the card and tree stay still for reduced motion', async () => {
  const card = await readFile(new URL('../app/components/home/RemainingCard.vue', import.meta.url), 'utf8')
  const tree = await readFile(new URL('../app/components/home/MoneyTree.vue', import.meta.url), 'utf8')

  assert.match(card, /prefers-reduced-motion: reduce/)
  assert.match(tree, /@media \(prefers-reduced-motion: no-preference\) \{/)
})

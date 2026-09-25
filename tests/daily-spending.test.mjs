import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { buildDailySpendingCells, dailySpendingColors } from '../utils/dailySpending.ts'

test('smoothly scales daily colors through green, yellow, orange, and red', () => {
  assert.deepEqual(dailySpendingColors(0, 100), {
    ratio: 0,
    backgroundColor: 'hsl(120 75% 78%)',
    borderColor: 'hsl(120 75% 88%)',
  })
  assert.equal(dailySpendingColors(50, 100).backgroundColor, 'hsl(85 75% 78%)')
  assert.equal(dailySpendingColors(100, 100).backgroundColor, 'hsl(50 75% 78%)')
  assert.equal(dailySpendingColors(150, 100).backgroundColor, 'hsl(39 75% 78%)')
  assert.equal(dailySpendingColors(200, 100).backgroundColor, 'hsl(28 75% 78%)')
  assert.equal(dailySpendingColors(300, 100).backgroundColor, 'hsl(0 75% 78%)')
  assert.equal(dailySpendingColors(400, 100).backgroundColor, 'hsl(0 75% 78%)')
})

test('current month returns 31 days ending today and marks month changes', () => {
  const cells = buildDailySpendingCells(2026, 9, [
    { id: 'groceries', date: '2026-08-13', amount: '25', budget_id: 'food', entity: 'Market' },
    { id: 'fuel', date: '2026-09-12', amount: 101, budget_id: 'car' },
  ], 100, new Date(2026, 8, 12))

  assert.equal(cells.length, 31)
  assert.equal(cells[0].dateKey, '2026-08-13')
  assert.equal(cells[0].amount, 25)
  assert.deepEqual(cells[0].transactions, [{
    id: 'groceries',
    amount: 25,
    budgetId: 'food',
    entity: 'Market',
  }])
  assert.deepEqual(cells.filter(cell => cell.startsNewMonth).map(cell => cell.dateKey), ['2026-09-01'])
  assert.equal(cells.at(-1).dateKey, '2026-09-12')
  assert.equal(cells.at(-1).budgetRatio, 1.01)
})

test('prior month ends on its final day and aggregates spending by date', () => {
  const cells = buildDailySpendingCells(2024, 2, [
    { date: '2024-02-29T12:00:00Z', amount: 40 },
    { date: '2024-02-29', amount: '60' },
  ], 100, new Date(2026, 8, 12))

  assert.equal(cells[0].dateKey, '2024-01-30')
  assert.deepEqual(cells.filter(cell => cell.startsNewMonth).map(cell => cell.dateKey), ['2024-02-01'])
  assert.deepEqual(cells.at(-1), {
    dateKey: '2024-02-29',
    amount: 100,
    budgetRatio: 1,
    transactions: [
      { id: '2024-02-29-0', amount: 40, budgetId: null, entity: null },
      { id: '2024-02-29-1', amount: 60, budgetId: null, entity: null },
    ],
    startsNewMonth: false,
  })
})

test('marks every month change in a 31-day window', () => {
  const cells = buildDailySpendingCells(2026, 3, [], 100, new Date(2026, 2, 1))

  assert.equal(cells[0].dateKey, '2026-01-30')
  assert.deepEqual(cells.filter(cell => cell.startsNewMonth).map(cell => cell.dateKey), [
    '2026-02-01',
    '2026-03-01',
  ])
})

test('home page renders the desktop-only figure across all three columns', async () => {
  const homePage = await readFile(new URL('../app/pages/home.vue', import.meta.url), 'utf8')
  const figure = await readFile(new URL('../app/components/home/DailySpendingFigure.vue', import.meta.url), 'utf8')

  assert.match(homePage, /import DailySpendingFigure from '~\/components\/home\/DailySpendingFigure\.vue'/)
  assert.match(homePage, /<DailySpendingFigure/)
  assert.match(homePage, /:budgets="store\.budgets"/)
  assert.match(homePage, /\.\.\.store\.prevMonthBudgetHits/)
  assert.match(figure, /hidden shadow lg:col-span-3 lg:block/)
  assert.match(figure, /Array|cells/)
  assert.match(figure, /Last 31 days/)
  assert.match(figure, /grid grid-cols-\[repeat\(31,minmax\(0,1fr\)\)\]/)
  assert.match(figure, /v-if="cell\.startsNewMonth"/)
  assert.match(figure, /border-l border-dashed border-gray-300/)
  assert.match(figure, /\{\{ formatMonth\(cell\.dateKey\) \}\}/)
  assert.match(figure, /bg-white text-\[10px\]/)
  assert.match(figure, /\{\{ formatDay\(cell\.dateKey\) \}\}/)
  assert.match(figure, /backgroundColor: cellColors\(cell\.amount\)\.backgroundColor/)
  assert.match(figure, /linear-gradient\(to right, hsl\(120 75% 78%\).*hsl\(0 75% 78%\)/)
  assert.match(figure, />100%<\/span>/)
  assert.match(figure, />300%\+<\/span>/)
  assert.match(figure, /v-for="transaction in cell\.transactions"/)
  assert.match(figure, /transactionBudget\(transaction\.budgetId\)\?\.color/)
  assert.match(figure, /#9CA3AF/)
  assert.match(figure, /class="group relative flex flex-col transition-transform hover:-translate-y-0\.5"/)
  assert.doesNotMatch(figure, /group-hover:-translate-y-0\.5/)
  assert.match(figure, /truncate text-center text-xs text-muted/)
  assert.match(figure, /\{\{ currency\.format\(cell\.amount\) \}\}/)
})

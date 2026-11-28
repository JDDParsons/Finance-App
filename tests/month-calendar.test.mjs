import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { buildMonthCalendarCells } from '../utils/monthCalendar.ts'

const now = new Date(2026, 10, 12, 23, 30)
const days = cells => cells.filter(Boolean)
const dayOf = (cells, day) => days(cells).find(cell => cell.day === day)

test('shows every day of the selected month in full weeks, also for the current month', () => {
  const cells = buildMonthCalendarCells(2026, 11, [], [], now)

  assert.equal(days(cells).length, 30)
  assert.equal(days(cells)[0].dateKey, '2026-11-01')
  assert.equal(days(cells).at(-1).dateKey, '2026-11-30')
  // November 2026 starts on a Sunday.
  assert.equal(cells[0].day, 1)
  assert.equal(cells.length % 7, 0)
})

test('leaves blanks around a month that starts mid-week and handles leap years', () => {
  const cells = buildMonthCalendarCells(2024, 2, [], [], now)

  assert.deepEqual(cells.slice(0, 4), [null, null, null, null])
  assert.equal(cells[4].day, 1)
  assert.equal(days(cells).length, 29)
  assert.equal(cells.length % 7, 0)
})

test('marks today only in the current month', () => {
  const current = days(buildMonthCalendarCells(2026, 11, [], [], now))
  assert.deepEqual(current.filter(cell => cell.isToday).map(cell => cell.day), [12])

  for (const [year, month] of [[2026, 10], [2026, 12], [2025, 11]]) {
    assert.equal(days(buildMonthCalendarCells(year, month, [], [], now)).some(cell => cell.isToday), false)
  }
})

test('adds up spending by day and leaves other months out', () => {
  const cells = buildMonthCalendarCells(2026, 11, [
    { id: 'a', date: '2026-11-03T12:00:00Z', amount: '25', budget_id: 'food' },
    { date: '2026-11-03', amount: 10 },
    { date: '2026-10-31', amount: 99 },
    { date: null, amount: 5 },
  ], [], now)

  assert.equal(dayOf(cells, 3).spent, 35)
  assert.deepEqual(dayOf(cells, 3).transactions.map(item => [item.id, item.budgetId]), [
    ['a', 'food'],
    ['2026-11-03-1', null],
  ])
  assert.equal(days(cells).reduce((sum, cell) => sum + cell.spent, 0), 35)
})

test('shows income days, as planned only while they are still ahead', () => {
  const cells = buildMonthCalendarCells(2026, 11, [], [
    { date: '2026-11-01', amount: 1000 },
    { date: '2026-11-12', amount: '200' },
    { date: '2026-11-13', amount: 300 },
    { date: '2026-11-13', amount: 50 },
    { date: '2026-12-01', amount: 999 },
  ], now)

  assert.deepEqual(dayOf(cells, 1).income, { amount: 1000, isPlanned: false })
  assert.deepEqual(dayOf(cells, 12).income, { amount: 200, isPlanned: false })
  assert.deepEqual(dayOf(cells, 13).income, { amount: 350, isPlanned: true })
  assert.equal(dayOf(cells, 2).income, null)
  assert.equal(days(cells).filter(cell => cell.income).length, 3)
})

test('the calendar sits below the remaining card on mobile and tablet', async () => {
  const homePage = await readFile(new URL('../app/pages/home.vue', import.meta.url), 'utf8')

  assert.match(homePage, /import DailySpendingCalendar from '~\/components\/home\/DailySpendingCalendar\.vue'/)
  assert.match(homePage, /<HomeRemainingCard[\s\S]*<DailySpendingCalendar[\s\S]*Total expenses and income[\s\S]*<DailySpendingFigure/)
  assert.match(homePage, /<DailySpendingCalendar[^>]*:hits="store\.budgetHits"\s+:income="store\.income"\s+:budgets="store\.budgets"/)
})

test('the calendar borders today, marks income and no longer colours days by spending', async () => {
  const calendar = await readFile(new URL('../app/components/home/DailySpendingCalendar.vue', import.meta.url), 'utf8')

  assert.match(calendar, /rounded-2xl[^"]*shadow-lg[^"]*lg:hidden/)
  assert.match(calendar, /cell\.isToday\s+\? 'border-green-500/)
  assert.match(calendar, /v-if="cell\.income"/)
  assert.match(calendar, /cell\.income\.isPlanned/)
  assert.match(calendar, /v-for="transaction in cell\.transactions"/)
  assert.doesNotMatch(calendar, /dailySpendingColors|dailyBudgetedIncome|linear-gradient|bg-linear|from-green/)
})

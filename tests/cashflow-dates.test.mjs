import assert from 'node:assert/strict'
import test from 'node:test'

import { datesInMonth, transactionDateFromQuery } from '../utils/cashflowDates.ts'

test('returns every day in a previous month in descending order', () => {
  const dates = datesInMonth({ year: 2026, month: 4 }, new Date(2026, 8, 23))

  assert.equal(dates.length, 30)
  assert.equal(dates[0], '2026-04-30')
  assert.equal(dates.at(-1), '2026-04-01')
})

test('includes leap day when a previous month is February in a leap year', () => {
  const dates = datesInMonth({ year: 2024, month: 2 }, new Date(2026, 8, 23))

  assert.equal(dates.length, 29)
  assert.ok(dates.includes('2024-02-29'))
})

test('returns only dates through today for the current month', () => {
  const dates = datesInMonth({ year: 2026, month: 9 }, new Date(2026, 8, 23))

  assert.equal(dates.length, 23)
  assert.equal(dates[0], '2026-09-23')
  assert.equal(dates.at(-1), '2026-09-01')
})

test('uses a valid query date and falls back for malformed or impossible dates', () => {
  assert.equal(transactionDateFromQuery('2026-09-23', '2026-01-01'), '2026-09-23')
  assert.equal(transactionDateFromQuery(['2026-09-23'], '2026-01-01'), '2026-09-23')
  assert.equal(transactionDateFromQuery('2026-02-30', '2026-01-01'), '2026-01-01')
  assert.equal(transactionDateFromQuery('not-a-date', '2026-01-01'), '2026-01-01')
})

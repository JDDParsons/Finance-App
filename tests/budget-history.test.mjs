import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBudgetHistory } from '../utils/budgetHistory.ts'

test('combines monthly budget periods and expenses in chronological order', () => {
  const history = buildBudgetHistory(
    [
      { budget_id: 'groceries', date: '2026-03-01', amount: 500 },
      { budget_id: 'groceries', date: '2026-01-01', amount: 450 },
      { budget_id: 'groceries', date: '2026-02-01', amount: 475 },
    ],
    [
      { budget_id: 'groceries', date: '2026-01-07', amount: 125 },
      { budget_id: 'groceries', date: '2026-01-19', amount: 200 },
      { budget_id: 'groceries', date: '2026-03-14', amount: 525 },
    ],
    '2026-01-01',
    '2026-04-01'
  )

  assert.deepEqual(history.get('groceries'), [
    { month: '2026-01', spent: 325, budgeted: 450 },
    { month: '2026-02', spent: 0, budgeted: 475 },
    { month: '2026-03', spent: 525, budgeted: 500 },
  ])
})

test('excludes history outside the requested window', () => {
  const history = buildBudgetHistory(
    [
      { budget_id: 'travel', date: '2025-12-01', amount: 100 },
      { budget_id: 'travel', date: '2026-01-01', amount: 200 },
      { budget_id: 'travel', date: '2026-04-01', amount: 300 },
    ],
    [{ budget_id: 'travel', date: '2026-02-10', amount: 75 }],
    '2026-01-01',
    '2026-04-01'
  )

  assert.deepEqual(history.get('travel'), [
    { month: '2026-01', spent: 0, budgeted: 200 },
    { month: '2026-02', spent: 75, budgeted: 0 },
  ])
})

test('fills inactive months between budget periods with zero values', () => {
  const history = buildBudgetHistory(
    [
      { budget_id: 'travel', date: '2026-07-01', amount: 800 },
      { budget_id: 'travel', date: '2026-08-01', amount: 600 },
      { budget_id: 'travel', date: '2026-11-01', amount: 900 },
    ],
    [
      { budget_id: 'travel', date: '2026-07-10', amount: 500 },
      { budget_id: 'travel', date: '2026-11-12', amount: 250 },
    ],
    '2026-01-01',
    '2027-01-01'
  )

  assert.deepEqual(history.get('travel'), [
    { month: '2026-07', spent: 500, budgeted: 800 },
    { month: '2026-08', spent: 0, budgeted: 600 },
    { month: '2026-09', spent: 0, budgeted: 0 },
    { month: '2026-10', spent: 0, budgeted: 0 },
    { month: '2026-11', spent: 250, budgeted: 900 },
  ])
})

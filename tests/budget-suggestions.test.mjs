import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBudgetAmountSuggestions } from '../utils/budgetSuggestions.ts'

test('prefers the nearest earlier budget period', () => {
  const suggestions = buildBudgetAmountSuggestions([
    { budget_id: 'salary', date: '2026-05-01', amount: 4000 },
    { budget_id: 'salary', date: '2026-06-01', amount: 4500 },
    { budget_id: 'salary', date: '2026-08-01', amount: 5000 },
  ], '2026-07-01')

  assert.equal(suggestions.get('salary'), 4500)
})

test('falls back to the nearest later budget period when backfilling', () => {
  const suggestions = buildBudgetAmountSuggestions([
    { budget_id: 'salary', date: '2026-10-01', amount: 5500 },
    { budget_id: 'salary', date: '2026-08-01', amount: 5000 },
  ], '2026-07-01')

  assert.equal(suggestions.get('salary'), 5000)
})

test('does not suggest a budget period already present in the target month', () => {
  const suggestions = buildBudgetAmountSuggestions([
    { budget_id: 'salary', date: '2026-07-01', amount: 5000 },
  ], '2026-07-01')

  assert.equal(suggestions.has('salary'), false)
})

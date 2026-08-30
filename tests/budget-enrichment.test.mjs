import assert from 'node:assert/strict'
import test from 'node:test'

import { enrichBudgets } from '../utils/budgetEnrichment.ts'

const incomeBudgets = [
  { id: 'salary', currentPeriod: { amount: 5000 } },
  { id: 'interest', currentPeriod: { amount: 100 } },
]

test('immediately associates an income record with its budget', () => {
  const records = [{ id: 'income-1', budget_id: 'salary', date: '2026-08-15', amount: 2500 }]
  const budgets = enrichBudgets(incomeBudgets, records, 2026, 8)

  assert.deepEqual(budgets[0].hits, records)
  assert.equal(budgets[0].numberOfHits, 1)
  assert.equal(budgets[0].totalHitAmount, 2500)
})

test('immediately moves an income record between budgets', () => {
  const records = [{ id: 'income-1', budget_id: 'interest', date: '2026-08-15', amount: 75 }]
  const budgets = enrichBudgets(incomeBudgets, records, 2026, 8)

  assert.equal(budgets[0].numberOfHits, 0)
  assert.deepEqual(budgets[1].hits, records)
  assert.equal(budgets[1].totalHitAmount, 75)
})

test('immediately removes a deleted income record from its budget', () => {
  const budgets = enrichBudgets(incomeBudgets, [], 2026, 8)

  assert.equal(budgets[0].numberOfHits, 0)
  assert.deepEqual(budgets[0].hits, [])
  assert.equal(budgets[0].totalHitAmount, 0)
})

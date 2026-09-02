import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveDonutIncome } from '../utils/homeChart.ts'

test('uses actual income for previous months', () => {
  assert.deepEqual(resolveDonutIncome({
    isCurrentMonth: false,
    actualIncome: 4200,
    budgetedIncome: 5000,
  }), {
    amount: 4200,
    label: 'Income',
  })
})

test('uses actual income when it exceeds current-month budgeted income', () => {
  assert.deepEqual(resolveDonutIncome({
    isCurrentMonth: true,
    actualIncome: 5200,
    budgetedIncome: 5000,
  }), {
    amount: 5200,
    label: 'Income',
  })
})

test('uses budgeted income when current-month actual income does not exceed it', () => {
  assert.deepEqual(resolveDonutIncome({
    isCurrentMonth: true,
    actualIncome: 5000,
    budgetedIncome: 5000,
  }), {
    amount: 5000,
    label: 'Budgeted income',
  })
})

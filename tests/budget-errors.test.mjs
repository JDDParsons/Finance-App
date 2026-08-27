import assert from 'node:assert/strict'
import test from 'node:test'

import { getBudgetErrorCode, getBudgetErrorMessage } from '../app/utils/budgetErrors.ts'
import { mapBudgetSupabaseError } from '../server/utils/supabase/budget-errors.ts'

test('maps a duplicate budget name to a stable conflict response', () => {
  const result = mapBudgetSupabaseError({
    code: '23505',
    message: 'duplicate key value violates unique constraint "Budgets_household_id_name_key"',
  })

  assert.equal(result.statusCode, 409)
  assert.equal(result.data.code, 'BUDGET_NAME_CONFLICT')
  assert.equal(result.statusMessage, 'A budget with this name already exists.')
})

test('maps invalid budget amounts to an unprocessable response', () => {
  const result = mapBudgetSupabaseError({
    code: '23514',
    message: 'violates check constraint "Budget_Period_amount_positive"',
  })

  assert.equal(result.statusCode, 422)
  assert.equal(result.data.code, 'BUDGET_AMOUNT_INVALID')
})

test('maps deletion of a period with expenses to a stable conflict response', () => {
  const result = mapBudgetSupabaseError({
    code: 'P0001',
    message: 'This budget period has expense records and cannot be deleted.',
  })

  assert.equal(result.statusCode, 409)
  assert.equal(result.data.code, 'BUDGET_PERIOD_HAS_EXPENSES')
  assert.match(result.statusMessage, /Remove those expenses first/)
})

test('does not expose unexpected Supabase details', () => {
  const result = mapBudgetSupabaseError({
    code: 'XX000',
    message: 'sensitive internal database detail',
  })

  assert.equal(result.statusCode, 500)
  assert.equal(result.data.code, 'BUDGET_OPERATION_FAILED')
  assert.doesNotMatch(result.statusMessage, /sensitive/)
})

test('reads the stable code and public message from a FetchError response', () => {
  const error = {
    message: '[POST] /api/budgets: 409 Server Error',
    data: {
      statusCode: 409,
      statusMessage: 'A budget with this name already exists.',
      data: { code: 'BUDGET_NAME_CONFLICT' },
    },
  }

  assert.equal(getBudgetErrorCode(error), 'BUDGET_NAME_CONFLICT')
  assert.equal(getBudgetErrorMessage(error, 'fallback'), 'A budget with this name already exists.')
})

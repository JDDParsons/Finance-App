import { createError } from 'h3'

export type BudgetErrorCode =
  | 'BUDGET_NAME_CONFLICT'
  | 'BUDGET_AMOUNT_INVALID'
  | 'BUDGET_PERIOD_HAS_EXPENSES'
  | 'BUDGET_FORBIDDEN'
  | 'BUDGET_NOT_FOUND'
  | 'BUDGET_OPERATION_FAILED'

export interface BudgetErrorResponse {
  statusCode: number
  statusMessage: string
  data: { code: BudgetErrorCode }
}

function errorText(error: unknown) {
  if (!error || typeof error !== 'object') return String(error ?? '')

  const value = error as Record<string, unknown>
  return [value.code, value.message, value.details, value.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function mapBudgetSupabaseError(error: unknown): BudgetErrorResponse {
  const text = errorText(error)

  if (text.includes('budgets_household_id_name_key')) {
    return {
      statusCode: 409,
      statusMessage: 'A budget with this name already exists.',
      data: { code: 'BUDGET_NAME_CONFLICT' },
    }
  }

  if (
    text.includes('budgets_amount_positive')
    || text.includes('budget_period_amount_positive')
  ) {
    return {
      statusCode: 422,
      statusMessage: 'Amount must be greater than 0.',
      data: { code: 'BUDGET_AMOUNT_INVALID' },
    }
  }

  if (
    text.includes('p0001')
    && text.includes('budget period has expense records')
  ) {
    return {
      statusCode: 409,
      statusMessage: 'This budget has expense records in the selected month and cannot be deleted for that month. Remove those expenses first, then try again.',
      data: { code: 'BUDGET_PERIOD_HAS_EXPENSES' },
    }
  }

  if (text.includes('42501')) {
    return {
      statusCode: 403,
      statusMessage: 'You do not have permission to change this budget.',
      data: { code: 'BUDGET_FORBIDDEN' },
    }
  }

  if (text.includes('p0002')) {
    return {
      statusCode: 404,
      statusMessage: 'The requested budget or budget period was not found.',
      data: { code: 'BUDGET_NOT_FOUND' },
    }
  }

  return {
    statusCode: 500,
    statusMessage: 'Unable to save the budget. Please try again.',
    data: { code: 'BUDGET_OPERATION_FAILED' },
  }
}

export function throwBudgetSupabaseError(error: unknown, operation: string): never {
  const mappedError = mapBudgetSupabaseError(error)

  if (mappedError.data.code === 'BUDGET_OPERATION_FAILED') {
    console.error(`Unexpected Supabase error while attempting to ${operation} a budget:`, error)
  }

  throw createError(mappedError)
}

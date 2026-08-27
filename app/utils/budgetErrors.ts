export type BudgetErrorCode
  = 'BUDGET_NAME_CONFLICT'
    | 'BUDGET_AMOUNT_INVALID'
    | 'BUDGET_PERIOD_HAS_EXPENSES'
    | 'BUDGET_FORBIDDEN'
    | 'BUDGET_NOT_FOUND'
    | 'BUDGET_OPERATION_FAILED'

export function getBudgetErrorCode(error: any): BudgetErrorCode | null {
  return error?.data?.data?.code
    ?? error?.data?.code
    ?? null
}

export function getBudgetErrorMessage(error: any, fallback: string) {
  return error?.data?.statusMessage
    ?? error?.statusMessage
    ?? fallback
}

export function isDuplicateBudgetNameError(error: any) {
  return getBudgetErrorCode(error) === 'BUDGET_NAME_CONFLICT'
}

export function isInvalidBudgetAmountError(error: any) {
  return getBudgetErrorCode(error) === 'BUDGET_AMOUNT_INVALID'
}

export function isBudgetPeriodHasExpensesError(error: any) {
  return getBudgetErrorCode(error) === 'BUDGET_PERIOD_HAS_EXPENSES'
}

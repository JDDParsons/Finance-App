export type BudgetErrorCode
  = 'BUDGET_NAME_CONFLICT'
    | 'BUDGET_AMOUNT_INVALID'
    | 'BUDGET_PERIOD_EXISTS'
    | 'BUDGET_PERIOD_MISSING'
    | 'BUDGET_PERIOD_HAS_TRANSACTIONS'
    | 'BUDGET_TYPE_MISMATCH'
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

export function isBudgetPeriodHasTransactionsError(error: any) {
  return getBudgetErrorCode(error) === 'BUDGET_PERIOD_HAS_TRANSACTIONS'
}

export function getMissingBudgetPeriodMessage(
  error: any,
  budgetName: string,
  date: string
) {
  if (getBudgetErrorCode(error) !== 'BUDGET_PERIOD_MISSING') return null
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`)
  const month = Number.isNaN(parsed.getTime())
    ? 'that month'
    : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(parsed)
  return `${budgetName} is not set up for ${month}. Add it from that month’s Budgets page or choose No budget.`
}

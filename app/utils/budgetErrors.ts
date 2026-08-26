function getErrorValues(error: any) {
  return [
    error?.code,
    error?.message,
    error?.statusMessage,
    error?.data?.code,
    error?.data?.message,
    error?.data?.statusMessage,
    error?.data?.details,
  ]
}

export function isDuplicateBudgetNameError(error: any) {
  return getErrorValues(error).some((value) => {
    const text = String(value ?? '')
    return text.includes('23505') || text.includes('Budgets_household_id_name_key')
  })
}

export function isInvalidBudgetAmountError(error: any) {
  return getErrorValues(error).some((value) => {
    const text = String(value ?? '')
    return text.includes('23514')
      || text.includes('Budgets_amount_positive')
      || text.includes('Budget_Period_amount_positive')
  })
}

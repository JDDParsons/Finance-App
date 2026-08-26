export function isDuplicateBudgetNameError(error: any) {
  const values = [
    error?.code,
    error?.message,
    error?.statusMessage,
    error?.data?.code,
    error?.data?.message,
    error?.data?.statusMessage,
    error?.data?.details,
  ]

  return values.some((value) => {
    const text = String(value ?? '')
    return text.includes('23505') || text.includes('Budgets_household_id_name_key')
  })
}
